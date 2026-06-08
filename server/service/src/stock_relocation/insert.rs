use chrono::Utc;
use repository::{
    RepositoryError, StockRelocationRow, StockRelocationRowRepository, StockRelocationStatus,
    TransactionError,
};

use crate::service_provider::ServiceContext;
use crate::stock_relocation::validate::{
    validate_movement, RelocationMovement, ValidateMovementError,
};

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertStockRelocation {
    pub lines: Vec<InsertStockRelocationLine>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertStockRelocationLine {
    pub id: String,
    pub from_stock_line_id: String,
    pub from_number_of_packs: f64,
    pub to_location_id: Option<String>,
    pub to_pack_size: f64,
}

#[derive(Debug, PartialEq)]
pub enum InsertStockRelocationError {
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
    DatabaseError(RepositoryError),
}

pub fn insert_stock_relocation(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertStockRelocation,
) -> Result<Vec<StockRelocationRow>, InsertStockRelocationError> {
    let results = ctx
        .connection
        .transaction_sync(|connection| {
            let now = Utc::now().naive_utc();
            let mut rows = Vec::with_capacity(input.lines.len());

            for line in input.lines {
                let stock_line = validate_movement(
                    connection,
                    store_id,
                    &RelocationMovement {
                        from_stock_line_id: line.from_stock_line_id.clone(),
                        from_number_of_packs: line.from_number_of_packs,
                        to_location_id: line.to_location_id.clone(),
                        to_pack_size: Some(line.to_pack_size),
                    },
                )?;

                let row = StockRelocationRow {
                    id: line.id.clone(),
                    created_datetime: now,
                    finalised_datetime: None,
                    from_stock_line_id: line.from_stock_line_id,
                    from_location_id: stock_line.location_id.clone(),
                    from_number_of_packs: line.from_number_of_packs,
                    to_stock_line_id: None,
                    to_location_id: line.to_location_id,
                    to_pack_size: Some(line.to_pack_size),
                    status: StockRelocationStatus::New,
                    store_id: store_id.to_string(),
                    user_id: ctx.user_id.clone(),
                };
                StockRelocationRowRepository::new(connection).upsert_one(&row)?;
                rows.push(row);
            }

            Ok(rows)
        })
        .map_err(|error: TransactionError<InsertStockRelocationError>| error.to_inner_error())?;

    Ok(results)
}

impl From<RepositoryError> for InsertStockRelocationError {
    fn from(error: RepositoryError) -> Self {
        InsertStockRelocationError::DatabaseError(error)
    }
}

impl From<ValidateMovementError> for InsertStockRelocationError {
    fn from(error: ValidateMovementError) -> Self {
        use InsertStockRelocationError as E;
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

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_location_1, mock_location_on_hold, mock_location_with_restricted_location_type_a,
            MockDataInserts,
        },
        test_db::setup_all,
        StockLineRow, StockLineRowRepository, StockRelocationStatus, Upsert,
    };
    use util::uuid::uuid;

    use crate::service_provider::ServiceProvider;

    use super::*;

    fn whole_line(id: &str, on_hold: bool) -> StockLineRow {
        StockLineRow {
            id: id.to_string(),
            item_id: "item_a".to_string(),
            store_id: "store_a".to_string(),
            pack_size: 1.0,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            on_hold,
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

    fn line(stock_line_id: &str) -> InsertStockRelocationLine {
        InsertStockRelocationLine {
            id: uuid(),
            from_stock_line_id: stock_line_id.to_string(),
            from_number_of_packs: 10.0,
            to_location_id: Some(mock_location_1().id),
            to_pack_size: 1.0,
        }
    }

    #[actix_rt::test]
    async fn stock_relocation_validation_errors() {
        let (service_provider, ctx) = setup("stock_relocation_validation_errors").await;
        whole_line("ok_sl", false).upsert(&ctx.connection).unwrap();
        whole_line("held_sl", true).upsert(&ctx.connection).unwrap();
        // Stock of an item restricted to location_type_b.
        StockLineRow {
            item_id: "restricted_location_type_item".to_string(),
            ..whole_line("restricted_sl", false)
        }
        .upsert(&ctx.connection)
        .unwrap();
        let service = &service_provider.stock_relocation_service;

        let insert = |line: InsertStockRelocationLine| {
            service.insert_stock_relocation(
                &ctx,
                "store_a",
                InsertStockRelocation { lines: vec![line] },
            )
        };

        assert_eq!(
            insert(line("held_sl")),
            Err(InsertStockRelocationError::StockLineOnHold(
                "held_sl".to_string()
            ))
        );
        assert_eq!(
            insert(InsertStockRelocationLine {
                from_number_of_packs: 999.0,
                ..line("ok_sl")
            }),
            Err(InsertStockRelocationError::NotEnoughStock(
                "ok_sl".to_string()
            ))
        );
        assert_eq!(
            insert(InsertStockRelocationLine {
                to_location_id: Some(mock_location_on_hold().id),
                ..line("ok_sl")
            }),
            Err(InsertStockRelocationError::LocationOnHold(
                mock_location_on_hold().id
            ))
        );
        assert_eq!(
            insert(InsertStockRelocationLine {
                to_location_id: Some(mock_location_with_restricted_location_type_a().id),
                ..line("restricted_sl")
            }),
            Err(InsertStockRelocationError::IncorrectLocationType)
        );
    }

    #[actix_rt::test]
    async fn stock_relocation_insert_does_not_move_stock() {
        let (service_provider, ctx) = setup("stock_relocation_insert_does_not_move_stock").await;
        whole_line("relocate_sl", false)
            .upsert(&ctx.connection)
            .unwrap();

        let service = &service_provider.stock_relocation_service;
        let rows = service
            .insert_stock_relocation(
                &ctx,
                "store_a",
                InsertStockRelocation {
                    lines: vec![InsertStockRelocationLine {
                        to_pack_size: 2.0,
                        ..line("relocate_sl")
                    }],
                },
            )
            .unwrap();

        assert_eq!(rows.len(), 1);
        let row = &rows[0];
        assert_eq!(row.status, StockRelocationStatus::New);
        assert_eq!(row.finalised_datetime, None);
        assert_eq!(row.to_stock_line_id, None);
        assert_eq!(row.to_pack_size, Some(2.0));

        let source = StockLineRowRepository::new(&ctx.connection)
            .find_one_by_id("relocate_sl")
            .unwrap()
            .unwrap();
        assert_eq!(source.available_number_of_packs, 10.0);
        assert_eq!(source.location_id, None);
    }
}
