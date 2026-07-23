use chrono::Utc;
use repository::{
    RepositoryError, StockLine, StockLineRow, StockRelocationLineRow,
    StockRelocationLineRowRepository, StockRelocationRow, StockRelocationRowRepository,
    StockRelocationStatus, StorageConnection, TransactionError,
};
use util::EPSILON;

use crate::{
    repack::{insert_repack_from_stock_line, InsertRepack, InsertRepackError},
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
    Repack(InsertRepackError),
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
                    finalise(ctx, connection, store_id, &row)?;
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
    relocation: &StockRelocationRow,
) -> Result<(), UpdateStockRelocationError> {
    use UpdateStockRelocationError::*;

    let line_repo = StockRelocationLineRowRepository::new(connection);
    let lines = line_repo.find_many_by_stock_relocation_id(&relocation.id)?;
    if lines.is_empty() {
        return Err(MovementHasNoLines);
    }

    let comment = format!("Stock movement #{}", relocation.stock_movement_number);

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

        line.destination_stock_line_id =
            apply_movement(ctx, connection, &line, stock_line, &comment)?;
        line_repo.upsert_one(&line)?;
    }

    Ok(())
}

fn apply_movement(
    ctx: &ServiceContext,
    connection: &StorageConnection,
    line: &StockRelocationLineRow,
    stock_line: StockLine,
    comment: &str,
) -> Result<Option<String>, UpdateStockRelocationError> {
    if is_full_move(&stock_line.stock_line_row, line) {
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

    // Partial move: split the stock line via a repack invoice (with unchanged pack
    // size) so the movement appears in the stock ledger for both stock lines, and a
    // location movement is recorded for the new line. The line was already validated
    // by validate_line_movement; repack validation (which disallows fractional packs)
    // is intentionally not run.
    let pack_size = stock_line.stock_line_row.pack_size;
    let result = insert_repack_from_stock_line(
        ctx,
        connection,
        stock_line,
        InsertRepack {
            stock_line_id: line.stock_line_id.clone(),
            number_of_packs: line.number_of_packs,
            new_pack_size: pack_size,
            new_location_id: line.destination_location_id.clone(),
            comment: Some(comment.to_string()),
        },
    )
    .map_err(UpdateStockRelocationError::Repack)?;

    Ok(Some(result.new_stock_line_id))
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
        activity_log::{ActivityLogFilter, ActivityLogRepository},
        location_movement::{LocationMovementFilter, LocationMovementRepository},
        mock::{mock_location_1, MockDataInserts},
        stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
        test_db::setup_all,
        ActivityLogType, EqualFilter, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository,
        InvoiceLineType, InvoiceRepository, InvoiceStatus, InvoiceType, StockLineRow,
        StockLineRowRepository, StockRelocationStatus,
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
        StockRelocationLineRowRepository::new(&ctx.connection)
            .upsert_one(&StockRelocationLineRow {
                id: id.clone(),
                stock_relocation_id: movement_id.to_string(),
                stock_line_id: stock_line_id.to_string(),
                number_of_packs,
                destination_location_id: Some(mock_location_1().id),
                ..Default::default()
            })
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
        let sl_repo = StockLineRowRepository::new(&ctx.connection);
        sl_repo.upsert_one(&stock_line("confirm_sl")).unwrap();
        sl_repo.upsert_one(&stock_line("full_sl")).unwrap();
        sl_repo.upsert_one(&stock_line("partial_sl")).unwrap();
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

        // Partial move creates a repack invoice so it shows in the stock ledger
        let relocation = StockRelocationRowRepository::new(&ctx.connection)
            .find_one_by_id(&partial_movement)
            .unwrap()
            .unwrap();
        let repack_invoices_for = |stock_line_id: &str| {
            InvoiceRepository::new(&ctx.connection)
                .query_by_filter(
                    InvoiceFilter::new()
                        .store_id(EqualFilter::equal_to("store_a".to_string()))
                        .r#type(InvoiceType::Repack.equal_to())
                        .stock_line_id(stock_line_id.to_string()),
                )
                .unwrap()
        };
        let invoices = repack_invoices_for(&new_id);
        assert_eq!(invoices.len(), 1);
        let invoice = &invoices[0].invoice_row;
        assert_eq!(invoice.status, InvoiceStatus::Verified);
        assert!(invoice.verified_datetime.is_some());
        assert_eq!(
            invoice.comment,
            Some(format!(
                "Stock movement #{}",
                relocation.stock_movement_number
            ))
        );

        let invoice_lines = InvoiceLineRepository::new(&ctx.connection)
            .query_by_filter(
                InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice.id.to_string())),
            )
            .unwrap();
        assert_eq!(invoice_lines.len(), 2);
        let stock_in = invoice_lines
            .iter()
            .find(|l| l.invoice_line_row.r#type == InvoiceLineType::StockIn)
            .unwrap();
        assert_eq!(stock_in.invoice_line_row.stock_line_id, Some(new_id.clone()));
        assert_eq!(
            stock_in.invoice_line_row.location_id,
            Some(mock_location_1().id)
        );
        assert_eq!(stock_in.invoice_line_row.number_of_packs, 4.0);
        assert_eq!(stock_in.invoice_line_row.pack_size, 1.0);
        let stock_out = invoice_lines
            .iter()
            .find(|l| l.invoice_line_row.r#type == InvoiceLineType::StockOut)
            .unwrap();
        assert_eq!(
            stock_out.invoice_line_row.stock_line_id,
            Some("partial_sl".to_string())
        );
        assert_eq!(stock_out.invoice_line_row.number_of_packs, 4.0);

        // Enter-only location movement recorded for the new stock line
        let movements = LocationMovementRepository::new(&ctx.connection)
            .query_by_filter(
                LocationMovementFilter::new().stock_line_id(EqualFilter::equal_to(new_id.clone())),
            )
            .unwrap();
        assert_eq!(movements.len(), 1);
        let movement = &movements[0].location_movement_row;
        assert_eq!(movement.location_id, Some(mock_location_1().id));
        assert!(movement.enter_datetime.is_some());
        assert_eq!(movement.exit_datetime, None);

        // Repack activity log linking new line back to the source
        let logs = ActivityLogRepository::new(&ctx.connection)
            .query_by_filter(
                ActivityLogFilter::new().record_id(EqualFilter::equal_to(new_id.clone())),
            )
            .unwrap();
        let repack_log = logs
            .iter()
            .find(|l| l.activity_log_row.r#type == ActivityLogType::Repack)
            .unwrap();
        assert_eq!(
            repack_log.activity_log_row.changed_from,
            Some("partial_sl".to_string())
        );

        // Both stock lines show the movement in the ledger
        let ledger_for = |stock_line_id: &str| {
            StockLineLedgerRepository::new(&ctx.connection)
                .query_by_filter(
                    StockLineLedgerFilter::new()
                        .stock_line_id(EqualFilter::equal_to(stock_line_id.to_string())),
                )
                .unwrap()
        };
        let new_line_ledger = ledger_for(&new_id);
        assert_eq!(new_line_ledger.len(), 1);
        assert_eq!(new_line_ledger[0].invoice_type, InvoiceType::Repack);
        assert_eq!(new_line_ledger[0].quantity, 4.0);
        assert_eq!(new_line_ledger[0].running_balance, 4.0);
        let source_ledger = ledger_for("partial_sl");
        assert_eq!(source_ledger.len(), 1);
        assert_eq!(source_ledger[0].invoice_type, InvoiceType::Repack);
        assert_eq!(source_ledger[0].quantity, -4.0);

        // Full move must not create an invoice
        assert_eq!(repack_invoices_for("full_sl").len(), 0);

        // Fractional pack quantities can be moved (repack validation is not applied)
        sl_repo.upsert_one(&stock_line("fraction_sl")).unwrap();
        let fraction_movement = new_movement(&service_provider, &ctx).await;
        let fraction_line_id = add_line(&ctx, &fraction_movement, "fraction_sl", 2.5);
        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&fraction_movement, StockRelocationStatus::Finalised),
            )
            .unwrap();
        let fraction_line = line_repo.find_one_by_id(&fraction_line_id).unwrap().unwrap();
        let fraction_new_id = fraction_line.destination_stock_line_id.clone().unwrap();
        let fraction_new_line = stock_line_repo
            .find_one_by_id(&fraction_new_id)
            .unwrap()
            .unwrap();
        assert_eq!(fraction_new_line.total_number_of_packs, 2.5);
        assert_eq!(repack_invoices_for(&fraction_new_id).len(), 1);

        // Moving all available packs while some are reserved (available < total)
        // must split, not relocate the whole line
        sl_repo
            .upsert_one(&StockLineRow {
                available_number_of_packs: 6.0,
                ..stock_line("reserved_sl")
            })
            .unwrap();
        let reserved_movement = new_movement(&service_provider, &ctx).await;
        let reserved_line_id = add_line(&ctx, &reserved_movement, "reserved_sl", 6.0);
        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                set_status(&reserved_movement, StockRelocationStatus::Finalised),
            )
            .unwrap();
        let reserved_line = line_repo
            .find_one_by_id(&reserved_line_id)
            .unwrap()
            .unwrap();
        let reserved_new_id = reserved_line.destination_stock_line_id.clone().unwrap();
        let reserved_source = stock_line_repo
            .find_one_by_id("reserved_sl")
            .unwrap()
            .unwrap();
        assert_eq!(reserved_source.available_number_of_packs, 0.0);
        assert_eq!(reserved_source.total_number_of_packs, 4.0);
        let reserved_new = stock_line_repo
            .find_one_by_id(&reserved_new_id)
            .unwrap()
            .unwrap();
        assert_eq!(reserved_new.total_number_of_packs, 6.0);
        assert_eq!(reserved_new.available_number_of_packs, 6.0);
        assert_eq!(repack_invoices_for(&reserved_new_id).len(), 1);

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
        StockLineRowRepository::new(&ctx.connection)
            .upsert_one(&stock_line("status_sl"))
            .unwrap();
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

        let sl_repo = StockLineRowRepository::new(&ctx.connection);
        sl_repo.upsert_one(&stock_line("changed_sl")).unwrap();
        let changed_movement = new_movement(&service_provider, &ctx).await;
        let line_id = add_line(&ctx, &changed_movement, "changed_sl", 10.0);
        sl_repo
            .upsert_one(&StockLineRow {
                available_number_of_packs: 2.0,
                ..stock_line("changed_sl")
            })
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
