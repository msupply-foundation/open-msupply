#[cfg(test)]
mod stock_take_test {
    use chrono::Utc;
    use repository::{
        mock::{
            mock_stock_line_a, mock_stock_take_a, mock_stock_take_finalized_without_lines,
            mock_stock_take_full_edit, mock_stock_take_line_a, mock_stock_take_line_new_stock_line,
            mock_stock_take_new_stock_line, mock_stock_take_no_count_change,
            mock_stock_take_no_lines, mock_stock_take_stock_deficit, mock_stock_take_stock_surplus,
            mock_stock_take_without_lines, mock_store_a, MockDataInserts,
        },
        schema::{InvoiceLineRowType, StockTakeRow, StockTakeStatus},
        test_db::setup_all,
        InvoiceLineRowRepository, StockLineRowRepository,
    };

    use crate::{
        service_provider::ServiceProvider,
        stock_take::{
            delete::DeleteStockTakeError,
            insert::{InsertStockTakeError, InsertStockTakeInput},
            update::{
                SnapshotCountCurrentCountMismatchData, UpdateStockTakeError, UpdateStockTakeInput,
            },
        },
    };

    #[actix_rt::test]
    async fn insert_stock_take() {
        let (_, _, connection_manager, _) =
            setup_all("insert_stock_take", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stock_take_service;

        // error: stock take already exists
        let store_a = mock_store_a();
        let existing_stock_take = mock_stock_take_a();
        let error = service
            .insert_stock_take(
                &context,
                &store_a.id,
                InsertStockTakeInput {
                    id: existing_stock_take.id,
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
                "invalid",
                InsertStockTakeInput {
                    id: "new_stock_take".to_string(),
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStockTakeError::InvalidStore);

        // success
        let store_a = mock_store_a();
        service
            .insert_stock_take(
                &context,
                &store_a.id,
                InsertStockTakeInput {
                    id: "new_stock_take".to_string(),
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                },
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn update_stock_take() {
        let (_, _, connection_manager, _) =
            setup_all("update_stock_take", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stock_take_service;

        // error: InvalidStore
        let existing_stock_take = mock_stock_take_a();
        let error = service
            .update_stock_take(
                &context,
                "invalid",
                UpdateStockTakeInput {
                    id: existing_stock_take.id.clone(),
                    comment: None,
                    description: None,
                    status: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeError::InvalidStore);

        // error: StockTakeDoesNotExist
        let store_a = mock_store_a();
        let error = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: "invalid".to_string(),
                    comment: None,
                    description: None,
                    status: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeError::StockTakeDoesNotExist);

        // error: CannotEditFinalised
        let store_a = mock_store_a();
        let stock_take = mock_stock_take_finalized_without_lines();
        let error = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id,
                    comment: Some("Comment".to_string()),
                    description: None,
                    status: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeError::CannotEditFinalised);

        let store_a = mock_store_a();
        let stock_take = mock_stock_take_finalized_without_lines();
        let error = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id,
                    comment: Some("Comment".to_string()),
                    description: None,
                    status: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeError::CannotEditFinalised);

        // error: SnapshotCountCurrentCountMismatch
        let store_a = mock_store_a();
        let mut stock_line = mock_stock_line_a();
        stock_line.total_number_of_packs = 5;
        StockLineRowRepository::new(&context.connection)
            .upsert_one(&stock_line)
            .unwrap();
        let stock_take = mock_stock_take_a();
        let error = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id,
                    comment: Some("Comment".to_string()),
                    description: None,
                    status: Some(StockTakeStatus::Finalized),
                },
            )
            .unwrap_err();
        assert_eq!(
            error,
            UpdateStockTakeError::SnapshotCountCurrentCountMismatch(vec![
                SnapshotCountCurrentCountMismatchData {
                    stock_take_line_id: mock_stock_take_line_a().id,
                    stock_line,
                }
            ])
        );

        // error: NoLines
        let store_a = mock_store_a();
        let stock_take = mock_stock_take_no_lines();
        let error = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id,
                    comment: Some("Comment".to_string()),
                    description: None,
                    status: Some(StockTakeStatus::Finalized),
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStockTakeError::NoLines);

        // success surplus should result in StockIn shipment line
        let store_a = mock_store_a();
        let stock_take = mock_stock_take_stock_surplus();
        let result = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id,
                    comment: None,
                    description: None,
                    status: Some(StockTakeStatus::Finalized),
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
        let stock_take = mock_stock_take_stock_deficit();
        let result = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id,
                    comment: None,
                    description: None,
                    status: Some(StockTakeStatus::Finalized),
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
        let stock_take = mock_stock_take_no_count_change();
        let result = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id,
                    comment: None,
                    description: None,
                    status: Some(StockTakeStatus::Finalized),
                },
            )
            .unwrap();
        let shipment_lines = InvoiceLineRowRepository::new(&context.connection)
            .find_many_by_invoice_id(&result.inventory_adjustment_id.unwrap())
            .unwrap()
            .pop();
        assert_eq!(shipment_lines, None);

        // success: no changes (not finalized)
        let store_a = mock_store_a();
        let stock_take = mock_stock_take_a();
        let result = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id,
                    comment: None,
                    description: None,
                    status: Some(StockTakeStatus::New),
                },
            )
            .unwrap();
        assert_eq!(result, mock_stock_take_a());

        // success: all changes (not finalized)
        let store_a = mock_store_a();
        let stock_take = mock_stock_take_full_edit();
        let result = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id.clone(),
                    comment: Some("comment_1".to_string()),
                    description: Some("description_1".to_string()),
                    status: Some(StockTakeStatus::New),
                },
            )
            .unwrap();
        assert_eq!(
            result,
            StockTakeRow {
                id: stock_take.id,
                store_id: store_a.id,
                comment: Some("comment_1".to_string()),
                description: Some("description_1".to_string()),
                status: stock_take.status,
                created_datetime: stock_take.created_datetime,
                finalised_datetime: stock_take.finalised_datetime,
                inventory_adjustment_id: stock_take.inventory_adjustment_id,
            }
        );

        // success: new stock line
        let store_a = mock_store_a();
        let stock_take = mock_stock_take_new_stock_line();
        let result = service
            .update_stock_take(
                &context,
                &store_a.id,
                UpdateStockTakeInput {
                    id: stock_take.id.clone(),
                    comment: None,
                    description: None,
                    status: Some(StockTakeStatus::Finalized),
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
        let stock_take_line = mock_stock_take_line_new_stock_line();
        assert_eq!(stock_line.expiry_date, stock_take_line.expiry_date);
        assert_eq!(stock_line.batch, stock_take_line.batch);
        assert_eq!(stock_line.pack_size, stock_take_line.pack_size.unwrap());
        assert_eq!(
            stock_line.cost_price_per_pack,
            stock_take_line.cost_price_per_pack.unwrap()
        );
        assert_eq!(
            stock_line.sell_price_per_pack,
            stock_take_line.sell_price_per_pack.unwrap()
        );
        assert_eq!(stock_line.note, stock_take_line.note);
    }

    #[actix_rt::test]
    async fn delete_stock_take() {
        let (_, _, connection_manager, _) =
            setup_all("delete_stock_take", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stock_take_service;

        // error: stock does not exist
        let store_a = mock_stock_take_without_lines();
        let error = service
            .delete_stock_take(&context, &store_a.id, "invalid")
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeError::StockTakeDoesNotExist);

        // error: invalid store
        let existing_stock_take = mock_stock_take_without_lines();
        let error = service
            .delete_stock_take(&context, "invalid", &existing_stock_take.id)
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeError::InvalidStore);

        // error: StockTakeLinesExist
        let store_a = mock_store_a();
        let stock_take_a = mock_stock_take_a();
        let error = service
            .delete_stock_take(&context, &store_a.id, &stock_take_a.id)
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeError::StockTakeLinesExist);

        // error: CannotEditFinalised
        let store_a = mock_store_a();
        let stock_take = mock_stock_take_finalized_without_lines();
        let error = service
            .delete_stock_take(&context, &store_a.id, &stock_take.id)
            .unwrap_err();
        assert_eq!(error, DeleteStockTakeError::CannotEditFinalised);

        // success
        let store_a = mock_store_a();
        let existing_stock_take = mock_stock_take_without_lines();
        let deleted_stock_take_id = service
            .delete_stock_take(&context, &store_a.id, &existing_stock_take.id)
            .unwrap();
        assert_eq!(existing_stock_take.id, deleted_stock_take_id);
        assert_eq!(
            service
                .get_stock_take(&context, existing_stock_take.id)
                .unwrap(),
            None
        );
    }
}
