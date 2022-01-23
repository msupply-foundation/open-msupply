#[cfg(test)]
mod stock_take_line_test {
    use repository::{
        mock::{
            mock_item_a, mock_item_a_lines, mock_locations, mock_new_stock_line_for_stock_take_a,
            mock_stock_take_a, mock_stock_take_finalized, mock_stock_take_line_a,
            mock_stock_take_line_finalized, mock_store_a, mock_store_b, MockDataInserts,
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

        // error: StockTakeDoesNotExist,
        let store_a = mock_store_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: "invalid".to_string(),
                    stock_line_id: Some(stock_line_a.id),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    counted_number_of_packs: Some(17),
                    item_id: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::StockTakeDoesNotExist);

        // error: InvalidStore,
        let stock_take_a = mock_stock_take_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stock_take_line(
                &context,
                "invalid_store",
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_a.id,
                    stock_line_id: Some(stock_line_a.id),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    counted_number_of_packs: Some(17),
                    item_id: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::InvalidStore);

        // error StockLineAlreadyExistsInStockTake
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
                    stock_line_id: Some(stock_line_a.id),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    counted_number_of_packs: Some(17),
                    item_id: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(
            error,
            InsertStockTakeLineError::StockLineAlreadyExistsInStockTake
        );

        // error LocationDoesNotExist
        let store_a = mock_store_a();
        let stock_take_a = mock_stock_take_a();
        let stock_line = mock_new_stock_line_for_stock_take_a();
        let error = service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_a.id,
                    stock_line_id: Some(stock_line.id),
                    location_id: Some("invalid".to_string()),
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    counted_number_of_packs: Some(17),
                    item_id: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::LocationDoesNotExist);

        // error StockTakeLineAlreadyExists
        let store_a = mock_store_a();
        let stock_take_a = mock_stock_take_a();
        let stock_take_line_a = mock_stock_take_line_a();
        let stock_line = mock_new_stock_line_for_stock_take_a();
        let error = service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: stock_take_line_a.id,
                    stock_take_id: stock_take_a.id,
                    stock_line_id: Some(stock_line.id),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    counted_number_of_packs: Some(17),
                    item_id: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::StockTakeLineAlreadyExists);

        // check CannotEditFinalised
        let store_a = mock_store_a();
        let stock_take_finalized = mock_stock_take_finalized();
        let stock_line = mock_new_stock_line_for_stock_take_a();
        let error = service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_finalized.id,
                    stock_line_id: Some(stock_line.id),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    counted_number_of_packs: Some(17),
                    item_id: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeLineError::CannotEditFinalised);

        // success with stock_line_id
        let store_a = mock_store_a();
        let stock_take_a = mock_stock_take_a();
        let stock_line = mock_new_stock_line_for_stock_take_a();
        service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_a.id,
                    stock_line_id: Some(stock_line.id),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    counted_number_of_packs: Some(17),
                    item_id: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap();

        // success with item_id
        let store_a = mock_store_a();
        let stock_take_a = mock_stock_take_a();
        let item_a = mock_item_a();
        service
            .insert_stock_take_line(
                &context,
                &store_a.id,
                InsertStockTakeLineInput {
                    id: uuid(),
                    stock_take_id: stock_take_a.id,
                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    counted_number_of_packs: Some(17),
                    item_id: Some(item_a.id),
                    expiry_date: None,
                    pack_size: None,
                    note: None,
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

        // error: StockTakeLineDoesNotExist
        let store_a = mock_store_a();
        let error = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: "invalid".to_string(),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeLineError::StockTakeLineDoesNotExist);

        // error: InvalidStore
        let stock_take_line_a = mock_stock_take_line_a();
        let error = service
            .update_stock_take_line(
                &context,
                "invalid",
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id,
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeLineError::InvalidStore);

        // error: LocationDoesNotExist
        let store_a = mock_store_a();
        let stock_take_line_a = mock_stock_take_line_a();
        let error = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id,
                    location_id: Some("invalid".to_string()),
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeLineError::LocationDoesNotExist);

        // error CannotEditFinalised
        let store_a = mock_store_a();
        let stock_take_line_a = mock_stock_take_line_finalized();
        let error = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id,
                    location_id: None,
                    batch: None,
                    comment: Some(
                        "Trying to edit a stock take line of a finalised stock take".to_string(),
                    ),
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeLineError::CannotEditFinalised);

        // success: no update
        let store_a = mock_store_a();
        let stock_take_line_a = mock_stock_take_line_a();
        let result = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id.clone(),
                    location_id: None,
                    batch: None,
                    comment: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    snapshot_number_of_packs: None,
                    counted_number_of_packs: None,
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap();
        assert_eq!(result.line, stock_take_line_a);

        // success: full update
        let store_a = mock_store_a();
        let stock_take_line_a = mock_stock_take_line_a();
        let location = mock_locations()[0].clone();
        let result = service
            .update_stock_take_line(
                &context,
                &store_a.id,
                UpdateStockTakeLineInput {
                    id: stock_take_line_a.id.clone(),
                    location_id: Some(location.id.clone()),
                    batch: Some("test_batch".to_string()),
                    comment: Some("test comment".to_string()),
                    cost_price_per_pack: Some(20.0),
                    sell_price_per_pack: Some(25.0),
                    snapshot_number_of_packs: Some(10),
                    counted_number_of_packs: Some(14),
                    expiry_date: None,
                    pack_size: None,
                    note: None,
                },
            )
            .unwrap();
        assert_eq!(
            result.line,
            StockTakeLineRow {
                id: stock_take_line_a.id,
                stock_take_id: stock_take_line_a.stock_take_id,
                stock_line_id: Some(stock_take_line_a.stock_line_id.unwrap()),
                location_id: Some(location.id),
                batch: Some("test_batch".to_string()),
                comment: Some("test comment".to_string()),
                cost_price_per_pack: Some(20.0),
                sell_price_per_pack: Some(25.0),
                snapshot_number_of_packs: 10,
                counted_number_of_packs: Some(14),
                item_id: stock_take_line_a.item_id,
                expiry_date: None,
                pack_size: None,
                note: None,
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
        assert_eq!(error, DeleteStockTakeLineError::InvalidStore);
        // error: invalid store
        let store_b = mock_store_b();
        let existing_line = mock_stock_take_line_a();
        let error = service
            .delete_stock_take_line(&context, &store_b.id, &existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeLineError::InvalidStore);

        // error CannotEditFinalised
        let store_a = mock_store_a();
        let existing_line = mock_stock_take_line_finalized();
        let error = service
            .delete_stock_take_line(&context, &store_a.id, &existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeLineError::CannotEditFinalised);

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
