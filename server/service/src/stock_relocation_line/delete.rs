use repository::{
    RepositoryError, StockRelocationLineRowRepository, StockRelocationRowRepository,
    StockRelocationStatus, StorageConnection, TransactionError,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub enum DeleteStockRelocationLineError {
    LineDoesNotExist,
    NotThisStoreRelocation,
    StockRelocationFinalised,
    DatabaseError(RepositoryError),
}

pub fn delete_stock_relocation_line(
    ctx: &ServiceContext,
    store_id: &str,
    line_id: String,
) -> Result<String, DeleteStockRelocationLineError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, store_id, &line_id)?;

            StockRelocationLineRowRepository::new(connection).delete(&line_id)?;
            Ok(line_id.clone())
        })
        .map_err(|error: TransactionError<DeleteStockRelocationLineError>| error.to_inner_error())
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    line_id: &str,
) -> Result<(), DeleteStockRelocationLineError> {
    use DeleteStockRelocationLineError::*;

    let line = StockRelocationLineRowRepository::new(connection)
        .find_one_by_id(line_id)?
        .ok_or(LineDoesNotExist)?;

    let sr = StockRelocationRowRepository::new(connection)
        .find_one_by_id(&line.stock_relocation_id)?
        .ok_or(LineDoesNotExist)?;
    if sr.store_id != store_id {
        return Err(NotThisStoreRelocation);
    }
    if sr.status == StockRelocationStatus::Finalised {
        return Err(StockRelocationFinalised);
    }

    Ok(())
}

impl From<RepositoryError> for DeleteStockRelocationLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteStockRelocationLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_location_1, MockDataInserts},
        test_db::setup_all,
        StockLineRow, StockLineRowRepository, StockRelocationLineRowRepository,
    };
    use util::uuid::uuid;

    use crate::service_provider::{ServiceContext, ServiceProvider};
    use crate::stock_relocation::insert::InsertStockRelocation;
    use crate::stock_relocation_line::upsert::{
        upsert_stock_relocation_line, UpsertStockRelocationLine,
    };

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

    async fn add_line(ctx: &ServiceContext, movement_id: &str, stock_line_id: &str) -> String {
        upsert_stock_relocation_line(
            ctx,
            "store_a",
            UpsertStockRelocationLine {
                id: uuid(),
                stock_relocation_id: movement_id.to_string(),
                stock_line_id: stock_line_id.to_string(),
                number_of_packs: 1.0,
                destination_location_id: Some(mock_location_1().id),
            },
        )
        .unwrap()
        .id
    }

    #[actix_rt::test]
    async fn delete_line_success() {
        let (service_provider, ctx) = setup("delete_line_success").await;
        StockLineRowRepository::new(&ctx.connection)
            .upsert_one(&stock_line("del_sl"))
            .unwrap();
        let movement_id = new_movement(&service_provider, &ctx).await;
        let line_id = add_line(&ctx, &movement_id, "del_sl").await;

        let deleted = delete_stock_relocation_line(&ctx, "store_a", line_id.clone()).unwrap();
        assert_eq!(deleted, line_id);
        assert!(StockRelocationLineRowRepository::new(&ctx.connection)
            .find_one_by_id(&line_id)
            .unwrap()
            .is_none());
    }

    #[actix_rt::test]
    async fn delete_line_errors() {
        use crate::stock_relocation::update::UpdateStockRelocation;

        let (service_provider, ctx) = setup("delete_line_errors").await;
        let sl_repo = StockLineRowRepository::new(&ctx.connection);
        sl_repo.upsert_one(&stock_line("del_sl")).unwrap();
        sl_repo.upsert_one(&stock_line("fin_sl")).unwrap();
        let service = &service_provider.stock_relocation_service;
        let movement_id = new_movement(&service_provider, &ctx).await;
        let line_id = add_line(&ctx, &movement_id, "del_sl").await;

        assert_eq!(
            delete_stock_relocation_line(&ctx, "store_a", uuid()),
            Err(DeleteStockRelocationLineError::LineDoesNotExist)
        );
        assert_eq!(
            delete_stock_relocation_line(&ctx, "store_b", line_id),
            Err(DeleteStockRelocationLineError::NotThisStoreRelocation)
        );

        let finalised_id = new_movement(&service_provider, &ctx).await;
        let finalised_line = add_line(&ctx, &finalised_id, "fin_sl").await;
        service
            .update_stock_relocation(
                &ctx,
                "store_a",
                UpdateStockRelocation {
                    id: finalised_id,
                    comment: None,
                    status: Some(StockRelocationStatus::Finalised),
                },
            )
            .unwrap();
        assert_eq!(
            delete_stock_relocation_line(&ctx, "store_a", finalised_line),
            Err(DeleteStockRelocationLineError::StockRelocationFinalised)
        );
    }
}
