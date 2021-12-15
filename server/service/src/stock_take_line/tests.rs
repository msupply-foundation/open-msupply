#[cfg(test)]
mod stock_take_line_test {
    use repository::{
        mock::{
            mock_item_a_lines, mock_stock_take_a, mock_stock_take_line_a, mock_store_a,
            mock_store_b, MockDataInserts,
        },
        test_db::setup_all,
    };
    use util::uuid::uuid;

    use crate::{
        service_provider::ServiceProvider,
        stock_take_line::{
            delete::DeleteStockTakeLineError,
            insert::{InsertStockTakeLineError, InsertStockTakeLineInput},
        },
    };

    #[actix_rt::test]
    async fn insert_stock_take_line() {
        let (_, _, connection_manager, _) =
            setup_all("insert_stock_take_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stock_take_line_service;

        // error: InvalidStockTakeId,
        let store_a = mock_store_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: "invalid".to_string(),
                    stock_line_id: stock_line_a.id,
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_pack: 0.0,
                    sell_price_pack: 0.0,
                    snapshot_number_of_packs: 15,
                    counted_number_of_packs: 17,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::InvalidStockTakeId);

        // error: InvalidStockLineId,
        let store_a = mock_store_a();
        let stock_take_a = mock_stock_take_a();
        let error = service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_a.id,
                    stock_line_id: "invalid".to_string(),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_pack: 0.0,
                    sell_price_pack: 0.0,
                    snapshot_number_of_packs: 15,
                    counted_number_of_packs: 17,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::InvalidStockLineId);

        // error: InvalidStoreId,
        let stock_take_a = mock_stock_take_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stock_take_line(
                &context,
                "invalid_store",
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_a.id,
                    stock_line_id: stock_line_a.id,
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_pack: 0.0,
                    sell_price_pack: 0.0,
                    snapshot_number_of_packs: 15,
                    counted_number_of_packs: 17,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::InvalidStoreId);

        // success
        let store_a = mock_store_a();
        let stock_take_a = mock_stock_take_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_a.id,
                    stock_line_id: stock_line_a.id,
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_pack: 0.0,
                    sell_price_pack: 0.0,
                    snapshot_number_of_packs: 15,
                    counted_number_of_packs: 17,
                },
            )
            .unwrap();
    }

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
