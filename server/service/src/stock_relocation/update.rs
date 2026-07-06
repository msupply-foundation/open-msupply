use chrono::Utc;
use repository::{
    ActivityLogType, RepositoryError, StockLineRow, StockLineRowRepository, StockRelocationLineRow,
    StockRelocationLineRowRepository, StockRelocationRow, StockRelocationRowRepository,
    StockRelocationStatus, StorageConnection, TransactionError,
};
use util::uuid::uuid;
use util::EPSILON;

use crate::{
    activity_log::activity_log_entry,
    service_provider::ServiceContext,
    stock_line::update::{update_stock_line, UpdateStockLine, UpdateStockLineError},
    stock_relocation::validate::{validate_line_movement, LineMovement, ValidateMovementError},
    NullableUpdate,
};

#[derive(Debug, Clone, PartialEq, Default)]
pub struct UpdateStockRelocation {
    pub id: String,
    pub comment: Option<String>,
    pub status: Option<StockRelocationStatus>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStockRelocationError {
    StockRelocationDoesNotExist,
    NotThisStoreRelocation,
    StockRelocationFinalised,
    CannotReverseStatus,
    MovementHasNoLines,
    LineValidation {
        line_id: String,
        error: ValidateMovementError,
    },
    UpdateStockLine(UpdateStockLineError),
    DatabaseError(RepositoryError),
}

pub fn update_stock_relocation(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateStockRelocation,
) -> Result<StockRelocationRow, UpdateStockRelocationError> {
    ctx.connection
        .transaction_sync(|connection| {
            use UpdateStockRelocationError::*;

            let mut row = StockRelocationRowRepository::new(connection)
                .find_one_by_id(&input.id)?
                .ok_or(StockRelocationDoesNotExist)?;
            if row.store_id != store_id {
                return Err(NotThisStoreRelocation);
            }
            if row.status == StockRelocationStatus::Finalised {
                return Err(StockRelocationFinalised);
            }

            if let Some(status) = input.status {
                if status.index() < row.status.index() {
                    return Err(CannotReverseStatus);
                }
                if status != StockRelocationStatus::New && row.confirmed_datetime.is_none() {
                    row.confirmed_datetime = Some(Utc::now().naive_utc());
                }
                if status == StockRelocationStatus::Finalised {
                    finalise(ctx, connection, store_id, &row.id)?;
                    row.finalised_datetime = Some(Utc::now().naive_utc());
                }
                row.status = status;
            }
            if let Some(comment) = input.comment {
                row.comment = Some(comment);
            }

            StockRelocationRowRepository::new(connection).upsert_one(&row)?;
            Ok(row)
        })
        .map_err(|error: TransactionError<UpdateStockRelocationError>| error.to_inner_error())
}

fn finalise(
    ctx: &ServiceContext,
    connection: &StorageConnection,
    store_id: &str,
    stock_relocation_id: &str,
) -> Result<(), UpdateStockRelocationError> {
    use UpdateStockRelocationError::*;

    let line_repo = StockRelocationLineRowRepository::new(connection);
    let lines = line_repo.find_many_by_stock_relocation_id(stock_relocation_id)?;
    if lines.is_empty() {
        return Err(MovementHasNoLines);
    }

    for mut line in lines {
        let stock_line = validate_line_movement(
            connection,
            store_id,
            &LineMovement {
                stock_line_id: line.stock_line_id.clone(),
                number_of_packs: line.number_of_packs,
                destination_location_id: line.destination_location_id.clone(),
            },
        )
        .map_err(|error| LineValidation {
            line_id: line.id.clone(),
            error,
        })?;

        line.destination_stock_line_id = apply_movement(ctx, connection, &line, &stock_line)?;
        line_repo.upsert_one(&line)?;
    }

    Ok(())
}

fn apply_movement(
    ctx: &ServiceContext,
    connection: &StorageConnection,
    line: &StockRelocationLineRow,
    stock_line: &StockLineRow,
) -> Result<Option<String>, UpdateStockRelocationError> {
    if is_full_move(stock_line, line) {
        update_stock_line(
            ctx,
            UpdateStockLine {
                id: line.stock_line_id.clone(),
                location: Some(NullableUpdate {
                    value: line.destination_location_id.clone(),
                }),
                ..Default::default()
            },
        )
        .map_err(UpdateStockRelocationError::UpdateStockLine)?;
        return Ok(None);
    }

    // Partial move
    let moved = line.number_of_packs;
    let source_total = stock_line.total_number_of_packs - moved;
    let source = StockLineRow {
        available_number_of_packs: stock_line.available_number_of_packs - moved,
        total_number_of_packs: source_total,
        total_volume: stock_line.volume_per_pack * source_total,
        ..stock_line.clone()
    };
    let new_line = StockLineRow {
        id: uuid(),
        location_id: line.destination_location_id.clone(),
        available_number_of_packs: moved,
        total_number_of_packs: moved,
        total_volume: stock_line.volume_per_pack * moved,
        ..stock_line.clone()
    };

    let stock_line_repo = StockLineRowRepository::new(connection);
    stock_line_repo.upsert_one(&source)?;
    stock_line_repo.upsert_one(&new_line)?;
    activity_log_entry(
        ctx,
        ActivityLogType::StockLineEdit,
        Some(new_line.id.clone()),
        Some(stock_line.id.clone()),
        None,
    )?;

    Ok(Some(new_line.id))
}

fn is_full_move(stock_line: &StockLineRow, line: &StockRelocationLineRow) -> bool {
    (line.number_of_packs - stock_line.available_number_of_packs).abs() < EPSILON
        && (stock_line.available_number_of_packs - stock_line.total_number_of_packs).abs() < EPSILON
}

impl From<RepositoryError> for UpdateStockRelocationError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockRelocationError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_location_1, MockDataInserts},
        test_db::setup_all,
        StockLineRow, StockLineRowRepository, StockRelocationStatus, Upsert,
    };
    use util::uuid::uuid;

    use crate::service_provider::{ServiceContext, ServiceProvider};
    use crate::stock_relocation::insert::InsertStockRelocation;

    use super::*;

    fn stock_line(id: &str) -> StockLineRow {
        StockLineRow {
            id: id.to_string(),
            item_id: "item_a".to_string(),
            store_id: "store_a".to_string(),
            pack_size: 1.0,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            ..Default::default()
        }
    }

    async fn setup(test: &str) -> (ServiceProvider, ServiceContext) {
        let (_, _, connection_manager, _) = setup_all(test, MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        (service_provider, context)
    }

    async fn new_movement(service_provider: &ServiceProvider, ctx: &ServiceContext) -> String {
        let id = uuid();
        service_provider
            .stock_relocation_service
            .insert_stock_relocation(
                ctx,
                "store_a",
                InsertStockRelocation {
                    id: id.clone(),
                    comment: None,
                },
            )
            .unwrap();
        id
    }

    fn add_line(
        ctx: &ServiceContext,
        movement_id: &str,
        stock_line_id: &str,
        number_of_packs: f64,
    ) -> String {
        let id = uuid();
        StockRelocationLineRow {
            id: id.clone(),
            stock_relocation_id: movement_id.to_string(),
            stock_line_id: stock_line_id.to_string(),
            number_of_packs,
            destination_location_id: Some(mock_location_1().id),
            ..Default::default()
        }
        .upsert(&ctx.connection)
        .unwrap();
        id
    }

    fn set_status(id: &str, status: StockRelocationStatus) -> UpdateStockRelocation {
        UpdateStockRelocation {
            id: id.to_string(),
            comment: None,
            status: Some(status),
        }
    }

    #[actix_rt::test]
    async fn stock_movement_update_success() {
        let (service_provider, ctx) = setup("stock_movement_update_success").await;
        stock_line("confirm_sl").upsert(&ctx.connection).unwrap();
        stock_line("full_sl").upsert(&ctx.connection).unwrap();
        stock_line("partial_sl").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;
        let line_repo = StockRelocationLineRowRepository::new(&ctx.connection);
        let stock_line_repo = StockLineRowRepository::new(&ctx.connection);

        // stock is untouched
        let confirm_movement = new_movement(&service_provider, &ctx).await;
        add_line(&ctx, &confirm_movement, "confirm_sl", 4.0);
        let confirmed = service
            .update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&confirm_movement, StockRelocationStatus::Confirmed),
            )
            .unwrap();
        assert_eq!(confirmed.status, StockRelocationStatus::Confirmed);
        assert!(confirmed.confirmed_datetime.is_some());
        assert_eq!(confirmed.finalised_datetime, None);
        let confirm_source = stock_line_repo
            .find_one_by_id("confirm_sl")
            .unwrap()
            .unwrap();
        assert_eq!(confirm_source.available_number_of_packs, 10.0);
        assert_eq!(confirm_source.location_id, None);

        // Finalise a full move
        let full_movement = new_movement(&service_provider, &ctx).await;
        add_line(&ctx, &full_movement, "full_sl", 10.0);
        let finalised = service
            .update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&full_movement, StockRelocationStatus::Finalised),
            )
            .unwrap();
        assert_eq!(finalised.status, StockRelocationStatus::Finalised);
        assert!(finalised.finalised_datetime.is_some());
        let full_source = stock_line_repo.find_one_by_id("full_sl").unwrap().unwrap();
        assert_eq!(full_source.available_number_of_packs, 10.0);
        assert_eq!(full_source.location_id, Some(mock_location_1().id));

        // partial move
        let partial_movement = new_movement(&service_provider, &ctx).await;
        let line_id = add_line(&ctx, &partial_movement, "partial_sl", 4.0);
        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&partial_movement, StockRelocationStatus::Finalised),
            )
            .unwrap();
        let partial_source = stock_line_repo
            .find_one_by_id("partial_sl")
            .unwrap()
            .unwrap();
        assert_eq!(partial_source.available_number_of_packs, 6.0);
        let line = line_repo.find_one_by_id(&line_id).unwrap().unwrap();
        let new_id = line.destination_stock_line_id.clone().unwrap();
        assert_ne!(new_id, "partial_sl");
        let new_line = stock_line_repo.find_one_by_id(&new_id).unwrap().unwrap();
        assert_eq!(new_line.pack_size, 1.0);
        assert_eq!(new_line.available_number_of_packs, 4.0);
        assert_eq!(new_line.location_id, Some(mock_location_1().id));

        // update comment
        let comment_movement = new_movement(&service_provider, &ctx).await;
        let updated = service
            .update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: comment_movement.clone(),
                    comment: Some("moved to bay 3".to_string()),
                    status: None,
                },
            )
            .unwrap();
        assert_eq!(updated.comment.as_deref(), Some("moved to bay 3"));
        let unchanged = service
            .update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&comment_movement, StockRelocationStatus::Confirmed),
            )
            .unwrap();
        assert_eq!(unchanged.comment.as_deref(), Some("moved to bay 3"));
        assert_eq!(unchanged.status, StockRelocationStatus::Confirmed);
    }

    #[actix_rt::test]
    async fn stock_movement_update_error() {
        let (service_provider, ctx) = setup("stock_movement_update_error").await;
        stock_line("status_sl").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;

        let empty_movement = new_movement(&service_provider, &ctx).await;
        assert_eq!(
            service.update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&empty_movement, StockRelocationStatus::Finalised)
            ),
            Err(UpdateStockRelocationError::MovementHasNoLines)
        );

        stock_line("changed_sl").upsert(&ctx.connection).unwrap();
        let changed_movement = new_movement(&service_provider, &ctx).await;
        let line_id = add_line(&ctx, &changed_movement, "changed_sl", 10.0);
        StockLineRow {
            available_number_of_packs: 2.0,
            ..stock_line("changed_sl")
        }
        .upsert(&ctx.connection)
        .unwrap();
        assert_eq!(
            service.update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&changed_movement, StockRelocationStatus::Finalised)
            ),
            Err(UpdateStockRelocationError::LineValidation {
                line_id,
                error: ValidateMovementError::NotEnoughStock("changed_sl".to_string()),
            })
        );

        let reversed_movement = new_movement(&service_provider, &ctx).await;
        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&reversed_movement, StockRelocationStatus::Confirmed),
            )
            .unwrap();
        assert_eq!(
            service.update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&reversed_movement, StockRelocationStatus::New)
            ),
            Err(UpdateStockRelocationError::CannotReverseStatus)
        );

        let movement_id = new_movement(&service_provider, &ctx).await;
        add_line(&ctx, &movement_id, "status_sl", 10.0);
        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&movement_id, StockRelocationStatus::Finalised),
            )
            .unwrap();
        assert_eq!(
            service.update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&movement_id, StockRelocationStatus::Finalised)
            ),
            Err(UpdateStockRelocationError::StockRelocationFinalised)
        );
    }
}
