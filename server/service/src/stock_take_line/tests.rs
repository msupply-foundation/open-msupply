#[cfg(test)]
mod stock_take_line_test {
    use repository::{
        mock::{
            mock_item_a_lines, mock_item_b_lines, mock_locations, mock_stock_take_a,
            mock_stock_take_line_a, mock_store_a, mock_store_b, MockDataInserts,
        },
        schema::StockTakeLineRow,
        test_db::setup_all,
    };
    use util::uuid::uuid;

    use crate::{
        service_provider::ServiceProvider,
        stock_take_line::{
            delete::DeleteStockTakeLineError,
            insert::{InsertStockTakeLineError, InsertStockTakeLineInput},
            update::{UpdateStockTakeLineError, UpdateStockTakeLineInput},
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

        // error InvalidLocationId
        let store_a = mock_store_a();
        let stock_take_a = mock_stock_take_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_a.id,
                    stock_line_id: stock_line_a.id,
                    location_id: Some("invalid".to_string()),
                    batch: None,
                    comment: None,
                    cost_price_pack: 0.0,
                    sell_price_pack: 0.0,
                    snapshot_number_of_packs: 15,
                    counted_number_of_packs: 17,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::InvalidLocationId);

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
    async fn update_stock_take_line() {
        let (_, _, connection_manager, _) =
            setup_all("update_stock_take_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stock_take_line_service;

        // error: InvalidStockTakeLineId
        let store_a = mock_store_a();
        let error = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: "invalid".to_string(),
                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_pack: None,
                    sell_price_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeLineError::InvalidStockTakeLineId);

        // error: InvalidStoreId
        let stock_take_line_a = mock_stock_take_line_a();
        let error = service
            .update_stock_take_line(
                &context,
                "invalid",
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id,
                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_pack: None,
                    sell_price_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeLineError::InvalidStoreId);

        // error: InvalidStockLineId
        let store_a = mock_store_a();
        let stock_take_line_a = mock_stock_take_line_a();
        let error = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id,
                    stock_line_id: Some("invalid".to_string()),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_pack: None,
                    sell_price_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeLineError::InvalidStockLineId);

        // error: InvalidLocationId
        let store_a = mock_store_a();
        let stock_take_line_a = mock_stock_take_line_a();
        let error = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id,
                    stock_line_id: None,
                    location_id: Some("invalid".to_string()),
                    batch: None,
                    comment: None,
                    cost_price_pack: None,
                    sell_price_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeLineError::InvalidLocationId);

        // success: no update
        let store_a = mock_store_a();
        let stock_take_line_a = mock_stock_take_line_a();
        let result = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id.clone(),
                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_pack: None,
                    sell_price_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                },
            )
            .unwrap();
        assert_eq!(result.line, stock_take_line_a);

        // success: full update
        let store_a = mock_store_a();
        let stock_take_line_a = mock_stock_take_line_a();
        let stock_line = mock_item_b_lines()[0].clone();
        let location = mock_locations()[0].clone();
        assert!(stock_take_line_a.stock_line_id != stock_line.id);
        let result = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id.clone(),
                    stock_line_id: Some(stock_line.id.clone()),
                    location_id: Some(location.id.clone()),
                    batch: Some("test_batch".to_string()),
                    comment: Some("test comment".to_string()),
                    cost_price_pack: Some(20.0),
                    sell_price_pack: Some(25.0),
                    snapshot_number_of_packs: Some(10),
                    counted_number_of_packs: Some(14),
                },
            )
            .unwrap();
        assert_eq!(
            result.line,
            StockTakeLineRow {
                id: stock_take_line_a.id,
                stock_take_id: stock_take_line_a.stock_take_id,
                stock_line_id: stock_line.id,
                location_id: Some(location.id),
                batch: Some("test_batch".to_string()),
                comment: Some("test comment".to_string()),
                cost_price_pack: 20.0,
                sell_price_pack: 25.0,
                snapshot_number_of_packs: 10,
                counted_number_of_packs: 14,
            }
        );
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
        assert_eq!(
            service
                .get_stock_take_line(&context, existing_line.id)
                .unwrap(),
            None
        );
    }
}
