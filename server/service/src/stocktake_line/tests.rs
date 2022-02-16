#[cfg(test)]
mod stocktake_line_test {
    use repository::{
        mock::{
            mock_item_a, mock_item_a_lines, mock_locations, mock_new_stock_line_for_stocktake_a,
            mock_stocktake_a, mock_stocktake_finalised, mock_stocktake_line_a,
            mock_stocktake_line_finalised, mock_store_a, mock_store_b, MockDataInserts,
        },
        schema::StocktakeLineRow,
        test_db::setup_all,
    };
    use util::uuid::uuid;

    use crate::{
        service_provider::ServiceProvider,
        stocktake_line::{
            delete::DeleteStocktakeLineError,
            insert::{InsertStocktakeLineError, InsertStocktakeLineInput},
            query::GetStocktakeLinesError,
            update::{UpdateStocktakeLineError, UpdateStocktakeLineInput},
        },
    };

    #[actix_rt::test]
    async fn query_stocktake_line() {
        let (_, _, connection_manager, _) =
            setup_all("query_stocktake_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stocktake_line_service;

        // error: InvalidStore,
        let error = service
            .get_stocktake_lines(
                &context,
                "invalid store",
                &mock_stocktake_a().id,
                None,
                None,
                None,
            )
            .unwrap_err();
        assert_eq!(error, GetStocktakeLinesError::InvalidStore);

        // error: InvalidStocktake,
        let error = service
            .get_stocktake_lines(&context, &mock_store_a().id, "invalid", None, None, None)
            .unwrap_err();
        assert_eq!(error, GetStocktakeLinesError::InvalidStocktake);

        // success
        let result = service
            .get_stocktake_lines(
                &context,
                &mock_store_a().id,
                &mock_stocktake_a().id,
                None,
                None,
                None,
            )
            .unwrap();
        assert!(result.count > 0);
    }

    #[actix_rt::test]
    async fn insert_stocktake_line() {
        let (_, _, connection_manager, _) =
            setup_all("insert_stocktake_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stocktake_line_service;

        // error: StocktakeDoesNotExist,
        let store_a = mock_store_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                &store_a.id,
                InsertStocktakeLineInput {
                    id: uuid(),
                    stocktake_id: "invalid".to_string(),
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
        assert_eq!(error, InsertStocktakeLineError::StocktakeDoesNotExist);

        // error: InvalidStore,
        let stocktake_a = mock_stocktake_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                "invalid_store",
                InsertStocktakeLineInput {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
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
        assert_eq!(error, InsertStocktakeLineError::InvalidStore);

        // error StockLineAlreadyExistsInStocktake
        let store_a = mock_store_a();
        let stocktake_a = mock_stocktake_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                &store_a.id,
                InsertStocktakeLineInput {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
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
            InsertStocktakeLineError::StockLineAlreadyExistsInStocktake
        );

        // error LocationDoesNotExist
        let store_a = mock_store_a();
        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                &store_a.id,
                InsertStocktakeLineInput {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
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
        assert_eq!(error, InsertStocktakeLineError::LocationDoesNotExist);

        // error StocktakeLineAlreadyExists
        let store_a = mock_store_a();
        let stocktake_a = mock_stocktake_a();
        let stocktake_line_a = mock_stocktake_line_a();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                &store_a.id,
                InsertStocktakeLineInput {
                    id: stocktake_line_a.id,
                    stocktake_id: stocktake_a.id,
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
        assert_eq!(error, InsertStocktakeLineError::StocktakeLineAlreadyExists);

        // check CannotEditFinalised
        let store_a = mock_store_a();
        let stocktake_finalised = mock_stocktake_finalised();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                &store_a.id,
                InsertStocktakeLineInput {
                    id: uuid(),
                    stocktake_id: stocktake_finalised.id,
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
        assert_eq!(error, InsertStocktakeLineError::CannotEditFinalised);

        // success with stock_line_id
        let store_a = mock_store_a();
        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        service
            .insert_stocktake_line(
                &context,
                &store_a.id,
                InsertStocktakeLineInput {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
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
        let stocktake_a = mock_stocktake_a();
        let item_a = mock_item_a();
        service
            .insert_stocktake_line(
                &context,
                &store_a.id,
                InsertStocktakeLineInput {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
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
    async fn update_stocktake_line() {
        let (_, _, connection_manager, _) =
            setup_all("update_stocktake_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stocktake_line_service;

        // error: StocktakeLineDoesNotExist
        let store_a = mock_store_a();
        let error = service
            .update_stocktake_line(
                &context,
                &store_a.id,
                UpdateStocktakeLineInput {
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
        assert_eq!(error, UpdateStocktakeLineError::StocktakeLineDoesNotExist);

        // error: InvalidStore
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                "invalid",
                UpdateStocktakeLineInput {
                    id: stocktake_line_a.id,
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
        assert_eq!(error, UpdateStocktakeLineError::InvalidStore);

        // error: LocationDoesNotExist
        let store_a = mock_store_a();
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                &store_a.id,
                UpdateStocktakeLineInput {
                    id: stocktake_line_a.id,
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
        assert_eq!(error, UpdateStocktakeLineError::LocationDoesNotExist);

        // error CannotEditFinalised
        let store_a = mock_store_a();
        let stocktake_line_a = mock_stocktake_line_finalised();
        let error = service
            .update_stocktake_line(
                &context,
                &store_a.id,
                UpdateStocktakeLineInput {
                    id: stocktake_line_a.id,
                    location_id: None,
                    batch: None,
                    comment: Some(
                        "Trying to edit a stocktake line of a finalised stocktake".to_string(),
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
        assert_eq!(error, UpdateStocktakeLineError::CannotEditFinalised);

        // success: no update
        let store_a = mock_store_a();
        let stocktake_line_a = mock_stocktake_line_a();
        let result = service
            .update_stocktake_line(
                &context,
                &store_a.id,
                UpdateStocktakeLineInput {
                    id: stocktake_line_a.id.clone(),
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
        assert_eq!(result.line, stocktake_line_a);

        // success: full update
        let store_a = mock_store_a();
        let stocktake_line_a = mock_stocktake_line_a();
        let location = mock_locations()[0].clone();
        let result = service
            .update_stocktake_line(
                &context,
                &store_a.id,
                UpdateStocktakeLineInput {
                    id: stocktake_line_a.id.clone(),
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
            StocktakeLineRow {
                id: stocktake_line_a.id,
                stocktake_id: stocktake_line_a.stocktake_id,
                stock_line_id: Some(stocktake_line_a.stock_line_id.unwrap()),
                location_id: Some(location.id),
                batch: Some("test_batch".to_string()),
                comment: Some("test comment".to_string()),
                cost_price_per_pack: Some(20.0),
                sell_price_per_pack: Some(25.0),
                snapshot_number_of_packs: 10,
                counted_number_of_packs: Some(14),
                item_id: stocktake_line_a.item_id,
                expiry_date: None,
                pack_size: None,
                note: None,
            }
        );
    }

    #[actix_rt::test]
    async fn delete_stocktake_line() {
        let (_, _, connection_manager, _) =
            setup_all("delete_stocktake_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stocktake_line_service;

        // error: stocktake line does not exist
        let store_a = mock_store_a();
        let error = service
            .delete_stocktake_line(&context, &store_a.id, "invalid")
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::StocktakeLineDoesNotExist);

        // error: invalid store
        let existing_line = mock_stocktake_line_a();
        let error = service
            .delete_stocktake_line(&context, "invalid", &existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::InvalidStore);
        // error: invalid store
        let store_b = mock_store_b();
        let existing_line = mock_stocktake_line_a();
        let error = service
            .delete_stocktake_line(&context, &store_b.id, &existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::InvalidStore);

        // error CannotEditFinalised
        let store_a = mock_store_a();
        let existing_line = mock_stocktake_line_finalised();
        let error = service
            .delete_stocktake_line(&context, &store_a.id, &existing_line.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeLineError::CannotEditFinalised);

        // success
        let store_a = mock_store_a();
        let existing_line = mock_stocktake_line_a();
        let deleted_id = service
            .delete_stocktake_line(&context, &store_a.id, &existing_line.id)
            .unwrap();
        assert_eq!(existing_line.id, deleted_id);
        assert_eq!(
            service
                .get_stocktake_line(&context, existing_line.id)
                .unwrap(),
            None
        );
    }
}
