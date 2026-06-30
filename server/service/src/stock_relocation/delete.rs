use repository::{
    RepositoryError, StockRelocationRowRepository, StockRelocationStatus, StorageConnection,
    TransactionError,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct DeleteStockRelocation {
    pub id: String,
}

#[derive(Debug, PartialEq)]
pub enum DeleteStockRelocationError {
    RelocationDoesNotExist,
    NotThisStoreRelocation,
    RelocationAlreadyFinalised,
    DatabaseError(RepositoryError),
}

pub fn delete_stock_relocation(
    ctx: &ServiceContext,
    store_id: &str,
    input: DeleteStockRelocation,
) -> Result<String, DeleteStockRelocationError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, store_id, &input.id)?;
            StockRelocationRowRepository::new(connection).delete(&input.id)?;
            Ok(input.id.clone())
        })
        .map_err(|error: TransactionError<DeleteStockRelocationError>| error.to_inner_error())
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<(), DeleteStockRelocationError> {
    use DeleteStockRelocationError::*;

    let row = StockRelocationRowRepository::new(connection)
        .find_one_by_id(id)?
        .ok_or(RelocationDoesNotExist)?;

    if row.store_id != store_id {
        return Err(NotThisStoreRelocation);
    }
    if row.status == StockRelocationStatus::Finalised {
        return Err(RelocationAlreadyFinalised);
    }

    Ok(())
}

impl From<RepositoryError> for DeleteStockRelocationError {
    fn from(error: RepositoryError) -> Self {
        DeleteStockRelocationError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::MockDataInserts, test_db::setup_all, StockLineRow, StockLineRowRepository,
        StockRelocationRowRepository, StockRelocationStatus,
    };
    use util::uuid::uuid;

    use crate::service_provider::{ServiceContext, ServiceProvider};
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

    async fn insert_relocation(
        service_provider: &ServiceProvider,
        ctx: &ServiceContext,
        stock_line_id: &str,
    ) -> String {
        service_provider
            .stock_relocation_service
            .insert_stock_relocation(
                ctx,
                "store_a",
                InsertStockRelocation {
                    lines: vec![InsertStockRelocationLine {
                        id: uuid(),
                        from_stock_line_id: stock_line_id.to_string(),
                        from_number_of_packs: 10.0,
                        to_location_id: None,
                        to_pack_size: 1.0,
                    }],
                },
            )
            .unwrap()[0]
            .id
            .clone()
    }

    #[actix_rt::test]
    async fn delete_stock_relocation_success() {
        let (service_provider, ctx) = setup("delete_stock_relocation_success").await;
        StockLineRowRepository::new(&ctx.connection)
            .upsert_one(&whole_line("delete_sl"))
            .unwrap();
        let service = &service_provider.stock_relocation_service;

        let id = insert_relocation(&service_provider, &ctx, "delete_sl").await;

        let deleted = service
            .delete_stock_relocation(&ctx, "store_a", DeleteStockRelocation { id: id.clone() })
            .unwrap();
        assert_eq!(deleted, id);
        assert_eq!(
            StockRelocationRowRepository::new(&ctx.connection)
                .find_one_by_id(&id)
                .unwrap(),
            None
        );
    }

    #[actix_rt::test]
    async fn delete_validation_errors() {
        let (service_provider, ctx) = setup("delete_validation_errors").await;
        StockLineRowRepository::new(&ctx.connection)
            .upsert_one(&whole_line("delete_sl"))
            .unwrap();
        let service = &service_provider.stock_relocation_service;

        assert_eq!(
            service.delete_stock_relocation(&ctx, "store_a", DeleteStockRelocation { id: uuid() }),
            Err(DeleteStockRelocationError::RelocationDoesNotExist)
        );

        let id = insert_relocation(&service_provider, &ctx, "delete_sl").await;

        assert_eq!(
            service.delete_stock_relocation(
                &ctx,
                "store_b",
                DeleteStockRelocation { id: id.clone() }
            ),
            Err(DeleteStockRelocationError::NotThisStoreRelocation)
        );

        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                crate::stock_relocation::update::UpdateStockRelocation {
                    id: id.clone(),
                    status: Some(StockRelocationStatus::Finalised),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(
            service.delete_stock_relocation(&ctx, "store_a", DeleteStockRelocation { id }),
            Err(DeleteStockRelocationError::RelocationAlreadyFinalised)
        );
    }
}
