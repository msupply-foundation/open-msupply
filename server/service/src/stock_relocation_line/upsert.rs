use repository::{
    RepositoryError, StockRelocationLineRow, StockRelocationLineRowRepository,
    StockRelocationRowRepository, StockRelocationStatus, StorageConnection, TransactionError,
};

use crate::service_provider::ServiceContext;
use crate::stock_relocation::validate::{
    validate_line_movement, LineMovement, ValidateMovementError,
};

#[derive(Debug, Clone, PartialEq, Default)]
pub struct UpsertStockRelocationLine {
    pub id: String,
    pub stock_relocation_id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub destination_location_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpsertStockRelocationLineError {
    StockRelocationDoesNotExist,
    NotThisStoreRelocation,
    StockRelocationFinalised,
    ValidateMovement(ValidateMovementError),
    DatabaseError(RepositoryError),
}

pub fn upsert_stock_relocation_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpsertStockRelocationLine,
) -> Result<StockRelocationLineRow, UpsertStockRelocationLineError> {
    ctx.connection
        .transaction_sync(|connection| {
            let stock_line = validate(connection, store_id, &input)?;
            let row = generate(input, stock_line);
            StockRelocationLineRowRepository::new(connection).upsert_one(&row)?;

            Ok(row)
        })
        .map_err(|error: TransactionError<UpsertStockRelocationLineError>| error.to_inner_error())
}

fn generate(
    input: UpsertStockRelocationLine,
    stock_line: repository::StockLineRow,
) -> StockRelocationLineRow {
    StockRelocationLineRow {
        id: input.id,
        stock_relocation_id: input.stock_relocation_id,
        stock_line_id: input.stock_line_id,
        destination_stock_line_id: None,
        source_location_id: stock_line.location_id,
        destination_location_id: input.destination_location_id,
        number_of_packs: input.number_of_packs,
    }
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpsertStockRelocationLine,
) -> Result<repository::StockLineRow, UpsertStockRelocationLineError> {
    use UpsertStockRelocationLineError::*;

    let sr = StockRelocationRowRepository::new(connection)
        .find_one_by_id(&input.stock_relocation_id)?
        .ok_or(StockRelocationDoesNotExist)?;
    if sr.store_id != store_id {
        return Err(NotThisStoreRelocation);
    }
    if sr.status == StockRelocationStatus::Finalised {
        return Err(StockRelocationFinalised);
    }

    let stock_line = validate_line_movement(
        connection,
        store_id,
        &LineMovement {
            stock_line_id: input.stock_line_id.clone(),
            number_of_packs: input.number_of_packs,
            destination_location_id: input.destination_location_id.clone(),
        },
    )
    .map_err(ValidateMovement)?;

    Ok(stock_line)
}

impl From<RepositoryError> for UpsertStockRelocationLineError {
    fn from(error: RepositoryError) -> Self {
        UpsertStockRelocationLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_location_1, mock_location_on_hold, MockDataInserts},
        test_db::setup_all,
        StockLineRow, Upsert,
    };
    use util::uuid::uuid;

    use crate::service_provider::{ServiceContext, ServiceProvider};
    use crate::stock_relocation::insert::InsertStockRelocation;

    use super::*;

    fn stock_line(id: &str, on_hold: bool) -> StockLineRow {
        StockLineRow {
            id: id.to_string(),
            item_id: "item_a".to_string(),
            store_id: "store_a".to_string(),
            batch: Some("batch1".to_string()),
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

    fn new_movement(service_provider: &ServiceProvider, ctx: &ServiceContext) -> String {
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

    #[actix_rt::test]
    async fn upsert_stock_relocation_line_success() {
        let (service_provider, ctx) = setup("upsert_stock_relocation_line_success").await;
        stock_line("held_sl", true).upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;

        let movement_id = new_movement(&service_provider, &ctx);

        let line = service
            .upsert_stock_relocation_line(
                &ctx,
                "store_a",
                UpsertStockRelocationLine {
                    id: uuid(),
                    stock_relocation_id: movement_id,
                    stock_line_id: "held_sl".to_string(),
                    number_of_packs: 4.0,
                    destination_location_id: Some(mock_location_1().id),
                },
            )
            .unwrap();

        assert_eq!(line.stock_line_id, "held_sl");
        assert_eq!(line.source_location_id, None);
        assert_eq!(line.number_of_packs, 4.0);
        assert_eq!(line.destination_location_id, Some(mock_location_1().id));
        assert_eq!(line.destination_stock_line_id, None);

        let updated = service
            .upsert_stock_relocation_line(
                &ctx,
                "store_a",
                UpsertStockRelocationLine {
                    id: line.id.clone(),
                    stock_relocation_id: line.stock_relocation_id.clone(),
                    stock_line_id: "held_sl".to_string(),
                    number_of_packs: 6.0,
                    destination_location_id: Some(mock_location_1().id),
                },
            )
            .unwrap();
        assert_eq!(updated.id, line.id);
        assert_eq!(updated.number_of_packs, 6.0);
    }

    #[actix_rt::test]
    async fn upsert_line_validation_errors() {
        let (service_provider, ctx) = setup("upsert_line_validation_errors").await;
        stock_line("ok_sl", false).upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;
        let movement_id = new_movement(&service_provider, &ctx);

        let upsert = |number_of_packs: f64, destination: Option<String>| {
            service.upsert_stock_relocation_line(
                &ctx,
                "store_a",
                UpsertStockRelocationLine {
                    id: uuid(),
                    stock_relocation_id: movement_id.clone(),
                    stock_line_id: "ok_sl".to_string(),
                    number_of_packs,
                    destination_location_id: destination,
                },
            )
        };

        assert_eq!(
            upsert(999.0, Some(mock_location_1().id)),
            Err(UpsertStockRelocationLineError::ValidateMovement(
                ValidateMovementError::NotEnoughStock("ok_sl".to_string())
            ))
        );
        assert_eq!(
            upsert(0.0, Some(mock_location_1().id)),
            Err(UpsertStockRelocationLineError::ValidateMovement(
                ValidateMovementError::InvalidNumberOfPacks
            ))
        );
        assert_eq!(
            upsert(1.0, Some(mock_location_on_hold().id)),
            Err(UpsertStockRelocationLineError::ValidateMovement(
                ValidateMovementError::DestinationLocationOnHold(mock_location_on_hold().id)
            ))
        );

        assert_eq!(
            service.upsert_stock_relocation_line(
                &ctx,
                "store_a",
                UpsertStockRelocationLine {
                    id: uuid(),
                    stock_relocation_id: uuid(),
                    stock_line_id: "ok_sl".to_string(),
                    number_of_packs: 1.0,
                    destination_location_id: Some(mock_location_1().id),
                }
            ),
            Err(UpsertStockRelocationLineError::StockRelocationDoesNotExist)
        );
        assert_eq!(
            service.upsert_stock_relocation_line(
                &ctx,
                "store_b",
                UpsertStockRelocationLine {
                    id: uuid(),
                    stock_relocation_id: movement_id,
                    stock_line_id: "ok_sl".to_string(),
                    number_of_packs: 1.0,
                    destination_location_id: Some(mock_location_1().id),
                }
            ),
            Err(UpsertStockRelocationLineError::NotThisStoreRelocation)
        );
    }
}
