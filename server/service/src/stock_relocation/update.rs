use chrono::Utc;
use repository::{
    InvoiceLineRowRepository, InvoiceLineType, RepositoryError, StockLineRow, StockRelocationRow,
    StockRelocationRowRepository, StockRelocationStatus, StorageConnection, TransactionError,
};
use util::EPSILON;

use crate::{
    repack::{insert_repack, InsertRepack, InsertRepackError},
    service_provider::ServiceContext,
    stock_line::update::{update_stock_line, UpdateStockLine, UpdateStockLineError},
    stock_relocation::validate::{validate_movement, RelocationMovement, ValidateMovementError},
    NullableUpdate,
};

#[derive(Debug, Clone, PartialEq, Default)]
pub struct UpdateStockRelocation {
    pub id: String,
    pub from_number_of_packs: Option<f64>,
    pub to_location_id: Option<NullableUpdate<String>>,
    pub to_pack_size: Option<f64>,
    pub status: Option<StockRelocationStatus>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStockRelocationError {
    RelocationDoesNotExist,
    NotThisStoreRelocation,
    RelocationAlreadyFinalised,
    StockLineDoesNotExist,
    NotThisStoreStockLine,
    StockLineOnHold(String),
    LocationOnHold(String),
    ToLocationDoesNotExist,
    NotThisStoreLocation,
    IncorrectLocationType,
    NotEnoughStock(String),
    InvalidNumberOfPacks,
    InvalidPackSize,
    CannotHaveFractionalPack,
    NewlyCreatedStockLineDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub fn update_stock_relocation(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateStockRelocation,
) -> Result<StockRelocationRow, UpdateStockRelocationError> {
    ctx.connection
        .transaction_sync(|connection| update_one(ctx, connection, store_id, input))
        .map_err(|error: TransactionError<UpdateStockRelocationError>| error.to_inner_error())
}

pub fn update_stock_relocations(
    ctx: &ServiceContext,
    store_id: &str,
    inputs: Vec<UpdateStockRelocation>,
) -> Result<Vec<StockRelocationRow>, UpdateStockRelocationError> {
    ctx.connection
        .transaction_sync(|connection| {
            inputs
                .into_iter()
                .map(|input| update_one(ctx, connection, store_id, input))
                .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|error: TransactionError<UpdateStockRelocationError>| error.to_inner_error())
}

fn update_one(
    ctx: &ServiceContext,
    connection: &StorageConnection,
    store_id: &str,
    input: UpdateStockRelocation,
) -> Result<StockRelocationRow, UpdateStockRelocationError> {
    let mut row = validate(connection, store_id, &input.id)?;

    if let Some(from_number_of_packs) = input.from_number_of_packs {
        row.from_number_of_packs = from_number_of_packs;
    }
    if let Some(to_location_id) = input.to_location_id {
        row.to_location_id = to_location_id.value;
    }
    if let Some(to_pack_size) = input.to_pack_size {
        row.to_pack_size = Some(to_pack_size);
    }

    let stock_line = validate_movement(
        connection,
        store_id,
        &RelocationMovement {
            from_stock_line_id: row.from_stock_line_id.clone(),
            from_number_of_packs: row.from_number_of_packs,
            to_location_id: row.to_location_id.clone(),
            to_pack_size: row.to_pack_size,
        },
    )?;
    row.from_location_id = stock_line.location_id.clone();

    let finalising = matches!(input.status, Some(StockRelocationStatus::Finalised));
    if finalising {
        row.to_stock_line_id = Some(apply_movement(ctx, connection, &row, &stock_line)?);
        row.status = StockRelocationStatus::Finalised;
        row.finalised_datetime = Some(Utc::now().naive_utc());
    }

    StockRelocationRowRepository::new(connection).upsert_one(&row)?;

    Ok(row)
}

fn apply_movement(
    ctx: &ServiceContext,
    connection: &StorageConnection,
    row: &StockRelocationRow,
    stock_line: &StockLineRow,
) -> Result<String, UpdateStockRelocationError> {
    if is_relocation_only(stock_line, row) {
        update_stock_line(
            ctx,
            UpdateStockLine {
                id: row.from_stock_line_id.clone(),
                location: Some(NullableUpdate {
                    value: row.to_location_id.clone(),
                }),
                ..Default::default()
            },
        )?;
        Ok(row.from_stock_line_id.clone())
    } else {
        let invoice = insert_repack(
            ctx,
            InsertRepack {
                stock_line_id: row.from_stock_line_id.clone(),
                number_of_packs: row.from_number_of_packs,
                new_pack_size: row.to_pack_size.unwrap_or(stock_line.pack_size),
                new_location_id: row.to_location_id.clone(),
            },
        )?;
        new_stock_line_id(connection, &invoice.invoice_row.id)
    }
}

fn is_relocation_only(stock_line: &StockLineRow, row: &StockRelocationRow) -> bool {
    let to_pack_size = row.to_pack_size.unwrap_or(stock_line.pack_size);
    (to_pack_size - stock_line.pack_size).abs() < EPSILON
        && (row.from_number_of_packs - stock_line.available_number_of_packs).abs() < EPSILON
        && (stock_line.available_number_of_packs - stock_line.total_number_of_packs).abs() < EPSILON
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<StockRelocationRow, UpdateStockRelocationError> {
    use UpdateStockRelocationError::*;

    let row = StockRelocationRowRepository::new(connection)
        .find_one_by_id(id)?
        .ok_or(RelocationDoesNotExist)?;

    if row.store_id != store_id {
        return Err(NotThisStoreRelocation);
    }
    if row.status == StockRelocationStatus::Finalised {
        return Err(RelocationAlreadyFinalised);
    }

    Ok(row)
}

fn new_stock_line_id(
    connection: &StorageConnection,
    invoice_id: &str,
) -> Result<String, UpdateStockRelocationError> {
    InvoiceLineRowRepository::new(connection)
        .find_many_by_invoice_id(invoice_id)?
        .into_iter()
        .find(|line| line.r#type == InvoiceLineType::StockIn)
        .and_then(|line| line.stock_line_id)
        .ok_or(UpdateStockRelocationError::NewlyCreatedStockLineDoesNotExist)
}

impl From<RepositoryError> for UpdateStockRelocationError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockRelocationError::DatabaseError(error)
    }
}

impl From<ValidateMovementError> for UpdateStockRelocationError {
    fn from(error: ValidateMovementError) -> Self {
        use UpdateStockRelocationError as E;
        match error {
            ValidateMovementError::StockLineDoesNotExist => E::StockLineDoesNotExist,
            ValidateMovementError::NotThisStoreStockLine => E::NotThisStoreStockLine,
            ValidateMovementError::StockLineOnHold(id) => E::StockLineOnHold(id),
            ValidateMovementError::LocationOnHold(id) => E::LocationOnHold(id),
            ValidateMovementError::ToLocationDoesNotExist => E::ToLocationDoesNotExist,
            ValidateMovementError::NotThisStoreLocation => E::NotThisStoreLocation,
            ValidateMovementError::IncorrectLocationType => E::IncorrectLocationType,
            ValidateMovementError::NotEnoughStock(id) => E::NotEnoughStock(id),
            ValidateMovementError::InvalidNumberOfPacks => E::InvalidNumberOfPacks,
            ValidateMovementError::InvalidPackSize => E::InvalidPackSize,
            ValidateMovementError::DatabaseError(e) => E::DatabaseError(e),
        }
    }
}

impl From<InsertRepackError> for UpdateStockRelocationError {
    fn from(error: InsertRepackError) -> Self {
        use UpdateStockRelocationError as E;
        match error {
            InsertRepackError::StockLineDoesNotExist => E::StockLineDoesNotExist,
            InsertRepackError::NotThisStoreStockLine => E::NotThisStoreStockLine,
            InsertRepackError::CannotHaveFractionalPack => E::CannotHaveFractionalPack,
            InsertRepackError::StockLineReducedBelowZero(stock_line) => {
                E::NotEnoughStock(stock_line.stock_line_row.id)
            }
            InsertRepackError::DatabaseError(e) => E::DatabaseError(e),
            InsertRepackError::NewlyCreatedInvoiceDoesNotExist => {
                E::NewlyCreatedStockLineDoesNotExist
            }
            InsertRepackError::InternalError(s) => E::InternalError(s),
        }
    }
}

impl From<UpdateStockLineError> for UpdateStockRelocationError {
    fn from(error: UpdateStockLineError) -> Self {
        use UpdateStockRelocationError as E;
        match error {
            UpdateStockLineError::StockDoesNotExist => E::StockLineDoesNotExist,
            UpdateStockLineError::StockDoesNotBelongToStore => E::NotThisStoreStockLine,
            UpdateStockLineError::LocationDoesNotExist => E::ToLocationDoesNotExist,
            UpdateStockLineError::DatabaseError(e) => E::DatabaseError(e),
            other => E::InternalError(format!("{:?}", other)),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_location_1, mock_location_2, MockDataInserts},
        test_db::setup_all,
        StockLineRow, StockLineRowRepository, StockRelocationStatus, Upsert,
    };
    use util::uuid::uuid;

    use crate::service_provider::ServiceProvider;
    use crate::stock_relocation::insert::{InsertStockRelocation, InsertStockRelocationLine};

    use super::*;

    fn whole_line(id: &str) -> StockLineRow {
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

    fn insert_line(stock_line_id: &str, to_pack_size: f64) -> InsertStockRelocationLine {
        InsertStockRelocationLine {
            id: uuid(),
            from_stock_line_id: stock_line_id.to_string(),
            from_number_of_packs: 10.0,
            to_location_id: Some(mock_location_1().id),
            to_pack_size,
        }
    }

    async fn insert_one(
        service_provider: &ServiceProvider,
        ctx: &ServiceContext,
        line: InsertStockRelocationLine,
    ) -> String {
        service_provider
            .stock_relocation_service
            .insert_stock_relocation(ctx, "store_a", InsertStockRelocation { lines: vec![line] })
            .unwrap()[0]
            .id
            .clone()
    }

    #[actix_rt::test]
    async fn update_stock_relocation_success() {
        let (service_provider, ctx) = setup("update_stock_relocation_success").await;
        whole_line("repack_sl").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;
        let stock_line_repo = StockLineRowRepository::new(&ctx.connection);

        let id = insert_one(&service_provider, &ctx, insert_line("repack_sl", 1.0)).await;

        // Edits values without finalising.
        let updated = service
            .update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: id.clone(),
                    from_number_of_packs: Some(4.0),
                    to_location_id: Some(NullableUpdate {
                        value: Some(mock_location_2().id),
                    }),
                    to_pack_size: Some(2.0),
                    status: None,
                },
            )
            .unwrap();

        assert_eq!(updated.status, StockRelocationStatus::New);
        assert_eq!(updated.from_number_of_packs, 4.0);
        assert_eq!(updated.to_location_id, Some(mock_location_2().id));
        assert_eq!(updated.to_pack_size, Some(2.0));
        assert_eq!(updated.to_stock_line_id, None);
        assert_eq!(updated.finalised_datetime, None);

        let source = stock_line_repo
            .find_one_by_id("repack_sl")
            .unwrap()
            .unwrap();
        assert_eq!(source.available_number_of_packs, 10.0);
        assert_eq!(source.location_id, None);

        // Finalises, applying the edited repack.
        let finalised = service
            .update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: id.clone(),
                    status: Some(StockRelocationStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(finalised.status, StockRelocationStatus::Finalised);
        assert!(finalised.finalised_datetime.is_some());

        let new_id = finalised.to_stock_line_id.clone().unwrap();
        assert_ne!(new_id, "repack_sl");
        let source = stock_line_repo
            .find_one_by_id("repack_sl")
            .unwrap()
            .unwrap();
        // 4 of 10 packs moved out of the source.
        assert_eq!(source.available_number_of_packs, 6.0);
        // 4 packs of size 1 → 2 packs of size 2 at the destination.
        let new_line = stock_line_repo.find_one_by_id(&new_id).unwrap().unwrap();
        assert_eq!(new_line.pack_size, 2.0);
        assert_eq!(new_line.available_number_of_packs, 2.0);
        assert_eq!(new_line.location_id, Some(mock_location_2().id));
    }

    #[actix_rt::test]
    async fn update_can_clear_to_location() {
        let (service_provider, ctx) = setup("update_can_clear_to_location").await;
        whole_line("clear_sl").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;

        let id = insert_one(&service_provider, &ctx, insert_line("clear_sl", 1.0)).await;

        // Omitting to_location_id leaves it unchanged.
        let unchanged = service
            .update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: id.clone(),
                    to_location_id: None,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(unchanged.to_location_id, Some(mock_location_1().id));

        // An explicit null clears it.
        let cleared = service
            .update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id,
                    to_location_id: Some(NullableUpdate { value: None }),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(cleared.to_location_id, None);
    }

    #[actix_rt::test]
    async fn update_stock_relocations_batch() {
        let (service_provider, ctx) = setup("update_stock_relocations_batch").await;
        whole_line("batch_sl_1").upsert(&ctx.connection).unwrap();
        whole_line("batch_sl_2").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;
        let relocation_repo = StockRelocationRowRepository::new(&ctx.connection);

        let id1 = insert_one(&service_provider, &ctx, insert_line("batch_sl_1", 1.0)).await;
        let id2 = insert_one(&service_provider, &ctx, insert_line("batch_sl_2", 1.0)).await;

        let finalised = service
            .update_stock_relocations(
                &ctx,
                "store_a",
                vec![
                    UpdateStockRelocation {
                        id: id1.clone(),
                        status: Some(StockRelocationStatus::Finalised),
                        ..Default::default()
                    },
                    UpdateStockRelocation {
                        id: id2,
                        status: Some(StockRelocationStatus::Finalised),
                        ..Default::default()
                    },
                ],
            )
            .unwrap();
        assert_eq!(finalised.len(), 2);
        assert!(finalised
            .iter()
            .all(|row| row.status == StockRelocationStatus::Finalised));

        whole_line("batch_sl_3").upsert(&ctx.connection).unwrap();
        whole_line("batch_sl_4").upsert(&ctx.connection).unwrap();
        let id3 = insert_one(&service_provider, &ctx, insert_line("batch_sl_3", 1.0)).await;
        let id4 = insert_one(&service_provider, &ctx, insert_line("batch_sl_4", 1.0)).await;

        let result = service.update_stock_relocations(
            &ctx,
            "store_a",
            vec![
                UpdateStockRelocation {
                    id: id3.clone(),
                    status: Some(StockRelocationStatus::Finalised),
                    ..Default::default()
                },
                // More packs than available → fails validation.
                UpdateStockRelocation {
                    id: id4,
                    from_number_of_packs: Some(999.0),
                    status: Some(StockRelocationStatus::Finalised),
                    ..Default::default()
                },
            ],
        );
        assert!(result.is_err());
        let row3 = relocation_repo.find_one_by_id(&id3).unwrap().unwrap();
        assert_eq!(row3.status, StockRelocationStatus::New);
    }

    #[actix_rt::test]
    async fn update_validation_errors() {
        let (service_provider, ctx) = setup("update_validation_errors").await;
        whole_line("ok_sl").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;

        assert_eq!(
            service.update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: uuid(),
                    ..Default::default()
                }
            ),
            Err(UpdateStockRelocationError::RelocationDoesNotExist)
        );

        let id = insert_one(&service_provider, &ctx, insert_line("ok_sl", 1.0)).await;

        assert_eq!(
            service.update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: id.clone(),
                    from_number_of_packs: Some(999.0),
                    ..Default::default()
                }
            ),
            Err(UpdateStockRelocationError::NotEnoughStock(
                "ok_sl".to_string()
            ))
        );

        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: id.clone(),
                    status: Some(StockRelocationStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(
            service.update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id,
                    ..Default::default()
                }
            ),
            Err(UpdateStockRelocationError::RelocationAlreadyFinalised)
        );
    }
}
