#[cfg(test)]
mod stock_take_line_test {
    use repository::{
        mock::{mock_stock_take_line_a, mock_store_a, mock_store_b, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        service_provider::ServiceProvider, stock_take_line::delete::DeleteStockTakeLineError,
    };

    #[actix_rt::test]
    async fn delete_stock_take_line() {
        let (_, _, connection_manager, _) =
            setup_all("delete_stock_take_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stock_take_line_service;

        // error: stock take line does not exist
        let store_a = mock_store_a();
        let error = service
            .delete_stock_take_line(&context, &store_a.id, "invalid")
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeLineError::StockTakeLineDoesNotExist);

        // error: invalid store
        let existing_line = mock_stock_take_line_a();
        let error = service
            .delete_stock_take_line(&context, "invalid", &existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeLineError::InvalidStoreId);
        // error: invalid store
        let store_b = mock_store_b();
        let existing_line = mock_stock_take_line_a();
        let error = service
            .delete_stock_take_line(&context, &store_b.id, &existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeLineError::InvalidStoreId);

        // success
        let store_a = mock_store_a();
        let existing_line = mock_stock_take_line_a();
        let deleted_id = service
            .delete_stock_take_line(&context, &store_a.id, &existing_line.id)
            .unwrap();
        assert_eq!(existing_line.id, deleted_id);
    }
}
