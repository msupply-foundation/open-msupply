#[cfg(test)]
mod stocktake_test {
    use chrono::Utc;
    use repository::{
        mock::{
            mock_stock_line_a, mock_stocktake_a, mock_stocktake_finalised_without_lines,
            mock_stocktake_full_edit, mock_stocktake_line_a, mock_stocktake_line_new_stock_line,
            mock_stocktake_new_stock_line, mock_stocktake_no_count_change, mock_stocktake_no_lines,
            mock_stocktake_stock_deficit, mock_stocktake_stock_surplus,
            mock_stocktake_without_lines, mock_store_a, MockDataInserts,
        },
        schema::{InvoiceLineRowType, StocktakeRow, StocktakeStatus},
        test_db::setup_all,
        InvoiceLineRowRepository, StockLineRowRepository, StocktakeLine,
    };

    use crate::{
        service_provider::ServiceProvider,
        stocktake::{
            delete::DeleteStocktakeError,
            insert::{InsertStocktakeError, InsertStocktakeInput},
            update::{UpdateStocktakeError, UpdateStocktakeInput},
        },
    };

    #[actix_rt::test]
    async fn insert_stocktake() {
        let (_, _, connection_manager, _) =
            setup_all("insert_stocktake", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stocktake_service;

        // error: stocktake already exists
        let store_a = mock_store_a();
        let existing_stocktake = mock_stocktake_a();
        let error = service
            .insert_stocktake(
                &context,
                &store_a.id,
                InsertStocktakeInput {
                    id: existing_stocktake.id,
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeError::StocktakeAlreadyExists);

        // error: store does not exist
        let error = service
            .insert_stocktake(
                &context,
                "invalid",
                InsertStocktakeInput {
                    id: "new_stocktake".to_string(),
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeError::InvalidStore);

        // success
        let store_a = mock_store_a();
        service
            .insert_stocktake(
                &context,
                &store_a.id,
                InsertStocktakeInput {
                    id: "new_stocktake".to_string(),
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                },
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn update_stocktake() {
        let (_, _, connection_manager, _) =
            setup_all("update_stocktake", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stocktake_service;

        // error: InvalidStore
        let existing_stocktake = mock_stocktake_a();
        let error = service
            .update_stocktake(
                &context,
                "invalid",
                UpdateStocktakeInput {
                    id: existing_stocktake.id.clone(),
                    comment: None,
                    description: None,
                    status: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::InvalidStore);

        // error: StocktakeDoesNotExist
        let store_a = mock_store_a();
        let error = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: "invalid".to_string(),
                    comment: None,
                    description: None,
                    status: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::StocktakeDoesNotExist);

        // error: CannotEditFinalised
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_finalised_without_lines();
        let error = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id,
                    comment: Some("Comment".to_string()),
                    description: None,
                    status: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::CannotEditFinalised);

        let store_a = mock_store_a();
        let stocktake = mock_stocktake_finalised_without_lines();
        let error = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id,
                    comment: Some("Comment".to_string()),
                    description: None,
                    status: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::CannotEditFinalised);

        // error: SnapshotCountCurrentCountMismatch
        let store_a = mock_store_a();
        let mut stock_line = mock_stock_line_a();
        stock_line.total_number_of_packs = 5;
        StockLineRowRepository::new(&context.connection)
            .upsert_one(&stock_line)
            .unwrap();
        let stocktake = mock_stocktake_a();
        let error = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id,
                    comment: Some("Comment".to_string()),
                    description: None,
                    status: Some(StocktakeStatus::Finalised),
                },
            )
            .unwrap_err();
        assert_eq!(
            error,
            UpdateStocktakeError::SnapshotCountCurrentCountMismatch(vec![StocktakeLine {
                line: mock_stocktake_line_a(),
                stock_line: Some(stock_line),
                location: None,
            }])
        );

        // error: NoLines
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_no_lines();
        let error = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id,
                    comment: Some("Comment".to_string()),
                    description: None,
                    status: Some(StocktakeStatus::Finalised),
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::NoLines);

        // success surplus should result in StockIn shipment line
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_stock_surplus();
        let result = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id,
                    comment: None,
                    description: None,
                    status: Some(StocktakeStatus::Finalised),
                },
            )
            .unwrap();
        let shipment = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(shipment.r#type, InvoiceLineRowType::StockIn);

        // success deficit should result in StockOut shipment line
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_stock_deficit();
        let result = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id,
                    comment: None,
                    description: None,
                    status: Some(StocktakeStatus::Finalised),
                },
            )
            .unwrap();
        let shipment = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        assert_eq!(shipment.r#type, InvoiceLineRowType::StockOut);

        // success: no count change should not generate shipment line
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_no_count_change();
        let result = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id,
                    comment: None,
                    description: None,
                    status: Some(StocktakeStatus::Finalised),
                },
            )
            .unwrap();
        let shipment_lines = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop();
        assert_eq!(shipment_lines, None);

        // success: no changes (not finalised)
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_a();
        let result = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id,
                    comment: None,
                    description: None,
                    status: Some(StocktakeStatus::New),
                },
            )
            .unwrap();
        assert_eq!(result, mock_stocktake_a());

        // success: all changes (not finalised)
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_full_edit();
        let result = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id.clone(),
                    comment: Some("comment_1".to_string()),
                    description: Some("description_1".to_string()),
                    status: Some(StocktakeStatus::New),
                },
            )
            .unwrap();
        assert_eq!(
            result,
            StocktakeRow {
                id: stocktake.id,
                store_id: store_a.id,
                stocktake_number: stocktake.stocktake_number,
                comment: Some("comment_1".to_string()),
                description: Some("description_1".to_string()),
                status: stocktake.status,
                created_datetime: stocktake.created_datetime,
                finalised_datetime: stocktake.finalised_datetime,
                inventory_adjustment_id: stocktake.inventory_adjustment_id,
            }
        );

        // success: new stock line
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_new_stock_line();
        let result = service
            .update_stocktake(
                &context,
                &store_a.id,
                UpdateStocktakeInput {
                    id: stocktake.id.clone(),
                    comment: None,
                    description: None,
                    status: Some(StocktakeStatus::Finalised),
                },
            )
            .unwrap();
        let shipment_line = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop()
            .unwrap();
        let stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&shipment_line.stock_line_id.unwrap())
            .unwrap();
        let stocktake_line = mock_stocktake_line_new_stock_line();
        assert_eq!(stock_line.expiry_date, stocktake_line.expiry_date);
        assert_eq!(stock_line.batch, stocktake_line.batch);
        assert_eq!(stock_line.pack_size, stocktake_line.pack_size.unwrap());
        assert_eq!(
            stock_line.cost_price_per_pack,
            stocktake_line.cost_price_per_pack.unwrap()
        );
        assert_eq!(
            stock_line.sell_price_per_pack,
            stocktake_line.sell_price_per_pack.unwrap()
        );
        assert_eq!(stock_line.note, stocktake_line.note);
    }

    #[actix_rt::test]
    async fn delete_stocktake() {
        let (_, _, connection_manager, _) =
            setup_all("delete_stocktake", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stocktake_service;

        // error: stock does not exist
        let store_a = mock_stocktake_without_lines();
        let error = service
            .delete_stocktake(&context, &store_a.id, "invalid")
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeError::StocktakeDoesNotExist);

        // error: invalid store
        let existing_stocktake = mock_stocktake_without_lines();
        let error = service
            .delete_stocktake(&context, "invalid", &existing_stocktake.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeError::InvalidStore);

        // TODO https://github.com/openmsupply/remote-server/issues/839
        // error: StocktakeLinesExist
        // let store_a = mock_store_a();
        // let stocktake_a = mock_stocktake_a();
        // let error = service
        //     .delete_stocktake(&context, &store_a.id, &stocktake_a.id)
        //     .unwrap_err();
        // assert_eq!(error, DeleteStocktakeError::StocktakeLinesExist);

        // error: CannotEditFinalised
        let store_a = mock_store_a();
        let stocktake = mock_stocktake_finalised_without_lines();
        let error = service
            .delete_stocktake(&context, &store_a.id, &stocktake.id)
            .unwrap_err();
        assert_eq!(error, DeleteStocktakeError::CannotEditFinalised);

        // success
        let store_a = mock_store_a();
        let existing_stocktake = mock_stocktake_without_lines();
        let deleted_stocktake_id = service
            .delete_stocktake(&context, &store_a.id, &existing_stocktake.id)
            .unwrap();
        assert_eq!(existing_stocktake.id, deleted_stocktake_id);
        assert_eq!(
            service
                .get_stocktake(&context, existing_stocktake.id)
                .unwrap(),
            None
        );
    }
}
