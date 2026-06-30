use repository::{
    RepositoryError, StockRelocationLineRowRepository, StockRelocationRowRepository,
    StockRelocationStatus, StorageConnection, TransactionError,
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
        .transaction_sync(|connection| delete_one(connection, store_id, &input.id))
        .map_err(|error: TransactionError<DeleteStockRelocationError>| error.to_inner_error())
}

pub fn delete_stock_relocations(
    ctx: &ServiceContext,
    store_id: &str,
    ids: Vec<String>,
) -> Result<Vec<String>, DeleteStockRelocationError> {
    ctx.connection
        .transaction_sync(|connection| {
            ids.iter()
                .map(|id| delete_one(connection, store_id, id))
                .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|error: TransactionError<DeleteStockRelocationError>| error.to_inner_error())
}

fn delete_one(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<String, DeleteStockRelocationError> {
    validate(connection, store_id, id)?;

    let line_repo = StockRelocationLineRowRepository::new(connection);
    for line in line_repo.find_many_by_stock_relocation_id(id)? {
        line_repo.delete(&line.id)?;
    }

    StockRelocationRowRepository::new(connection).delete(id)?;
    Ok(id.to_string())
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
        mock::{mock_location_1, MockDataInserts},
        test_db::setup_all,
        StockLineRow, StockLineRowRepository, StockRelocationLineRow,
        StockRelocationLineRowRepository, StockRelocationRowRepository, StockRelocationStatus,
        Upsert,
    };
    use util::uuid::uuid;

    use crate::service_provider::{ServiceContext, ServiceProvider};
    use crate::stock_relocation::insert::InsertStockRelocation;
    use crate::stock_relocation::update::UpdateStockRelocation;

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

    fn add_line(
        ctx: &ServiceContext,
        movement_id: &str,
        stock_line_id: &str,
        number_of_packs: f64,
    ) -> String {
        let stock_line = StockLineRowRepository::new(&ctx.connection)
            .find_one_by_id(stock_line_id)
            .unwrap()
            .unwrap();
        let id = uuid();
        StockRelocationLineRow {
            id: id.clone(),
            stock_relocation_id: movement_id.to_string(),
            stock_line_id: stock_line_id.to_string(),
            item_id: stock_line.item_id,
            pack_size: stock_line.pack_size,
            number_of_packs,
            destination_location_id: Some(mock_location_1().id),
            ..Default::default()
        }
        .upsert(&ctx.connection)
        .unwrap();
        id
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
    async fn stock_movement_delete_success() {
        let (service_provider, ctx) = setup("stock_movement_delete_success").await;
        stock_line("delete_sl").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;
        let repo = StockRelocationRowRepository::new(&ctx.connection);
        let line_repo = StockRelocationLineRowRepository::new(&ctx.connection);

        let id = new_movement(&service_provider, &ctx);
        let deleted = service
            .delete_stock_relocation(&ctx, "store_a", DeleteStockRelocation { id: id.clone() })
            .unwrap();
        assert_eq!(deleted, id);
        assert!(repo.find_one_by_id(&id).unwrap().is_none());

        let delete_id = new_movement(&service_provider, &ctx);
        let line_id = add_line(&ctx, &delete_id, "delete_sl", 4.0);
        assert!(line_repo.find_one_by_id(&line_id).unwrap().is_some());
        service
            .delete_stock_relocation(
                &ctx,
                "store_a",
                DeleteStockRelocation {
                    id: delete_id.clone(),
                },
            )
            .unwrap();
        assert!(repo.find_one_by_id(&delete_id).unwrap().is_none());
        assert!(line_repo.find_one_by_id(&line_id).unwrap().is_none());

        // Batch delete is all-or-nothing.
        let id1 = new_movement(&service_provider, &ctx);
        let id2 = new_movement(&service_provider, &ctx);
        let batch_deleted = service
            .delete_stock_relocations(&ctx, "store_a", vec![id1.clone(), id2.clone()])
            .unwrap();
        assert_eq!(batch_deleted.len(), 2);
        assert!(repo.find_one_by_id(&id1).unwrap().is_none());
        assert!(repo.find_one_by_id(&id2).unwrap().is_none());

        // roll-back
        let id3 = new_movement(&service_provider, &ctx);
        assert!(service
            .delete_stock_relocations(&ctx, "store_a", vec![id3.clone(), uuid()])
            .is_err());
        assert!(repo.find_one_by_id(&id3).unwrap().is_some());
    }

    #[actix_rt::test]
    async fn stock_movement_delete_error() {
        let (service_provider, ctx) = setup("stock_movement_delete_error").await;
        stock_line("fin_sl").upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;

        assert_eq!(
            service.delete_stock_relocation(&ctx, "store_a", DeleteStockRelocation { id: uuid() }),
            Err(DeleteStockRelocationError::RelocationDoesNotExist)
        );

        let id = new_movement(&service_provider, &ctx);
        assert_eq!(
            service.delete_stock_relocation(
                &ctx,
                "store_b",
                DeleteStockRelocation { id: id.clone() }
            ),
            Err(DeleteStockRelocationError::NotThisStoreRelocation)
        );

        let finalised_id = new_movement(&service_provider, &ctx).await;
        add_line(&ctx, &finalised_id, "fin_sl", 10.0);
        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: finalised_id.clone(),
                    comment: None,
                    status: Some(StockRelocationStatus::Finalised),
                },
            )
            .unwrap();
        assert_eq!(
            service.delete_stock_relocation(
                &ctx,
                "store_a",
                DeleteStockRelocation { id: finalised_id }
            ),
            Err(DeleteStockRelocationError::RelocationAlreadyFinalised)
        );
    }
}
