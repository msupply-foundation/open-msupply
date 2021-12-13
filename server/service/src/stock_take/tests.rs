#[cfg(test)]
mod stock_take_test {
    use chrono::Utc;
    use repository::{
        mock::{mock_stock_take_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        service_provider::ServiceProvider,
        stock_take::{
            delete::{DeleteStockTakeError, DeleteStockTakeInput},
            insert::{InsertStockTakeError, InsertStockTakeInput},
        },
    };

    #[actix_rt::test]
    async fn insert_stock_take() {
        let (_, _, connection_manager, _) =
            setup_all("insert_stock_take", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stock_take_service;

        // error: stock take exists
        let store_a = mock_store_a();
        let existing_stock_take = mock_stock_take_a();
        let error = service
            .insert_stock_take(
                &context,
                InsertStockTakeInput {
                    id: existing_stock_take.id,
                    store_id: store_a.id,
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeError::StockTakeAlreadyExists);

        // error: store does not exist
        let error = service
            .insert_stock_take(
                &context,
                InsertStockTakeInput {
                    id: "new_stock_take".to_string(),
                    store_id: "invalid".to_string(),
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeError::InvalidStoreId);

        // success
        let store_a = mock_store_a();
        service
            .insert_stock_take(
                &context,
                InsertStockTakeInput {
                    id: "new_stock_take".to_string(),
                    store_id: store_a.id,
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                },
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn delete_stock_take() {
        let (_, _, connection_manager, _) =
            setup_all("delete_stock_take", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stock_take_service;

        // error: stock does not exist
        let store_a = mock_store_a();
        let error = service
            .delete_stock_take(
                &context,
                DeleteStockTakeInput {
                    id: "invalid".to_string(),
                    store_id: store_a.id,
                },
            )
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeError::StockTakeDoesNotExist);

        // error: store does not exist
        let existing_stock_take = mock_stock_take_a();
        let error = service
            .delete_stock_take(
                &context,
                DeleteStockTakeInput {
                    id: existing_stock_take.id,
                    store_id: "invalid".to_string(),
                },
            )
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeError::InvalidStoreId);

        // success
        let store_a = mock_store_a();
        let existing_stock_take = mock_stock_take_a();
        let deleted_stock_take_id = service
            .delete_stock_take(
                &context,
                DeleteStockTakeInput {
                    id: existing_stock_take.id.clone(),
                    store_id: store_a.id,
                },
            )
            .unwrap();
        assert_eq!(existing_stock_take.id, deleted_stock_take_id);
    }
}
