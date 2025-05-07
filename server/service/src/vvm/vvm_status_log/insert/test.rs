#[cfg(test)]
mod insert {
    use repository::{
        mock::{
            mock_outbound_shipment_a_invoice_lines, mock_stock_line_a, mock_store_a,
            mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
        vvm_status::vvm_status_row::{VVMStatusRow, VVMStatusRowRepository},
        InvoiceLineRowRepository,
    };

    use crate::{
        service_provider::ServiceProvider,
        vvm::vvm_status_log::insert::{InsertVVMStatusLogError, InsertVVMStatusLogInput},
    };

    #[actix_rt::test]
    async fn insert_vvm_status_log_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_vvm_status_log_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.vvm_service;

        // VVMStatusDoesNotExist
        assert_eq!(
            service.insert_vvm_status_log(
                &context,
                InsertVVMStatusLogInput {
                    id: "test_id".to_string(),
                    stock_line_id: "stock_line_id".to_string(),
                    status_id: "vvm_status_id".to_string(),
                    comment: Some("comment".to_string()),
                    invoice_line_id: "invoice_line_id".to_string(),
                },
            ),
            Err(InsertVVMStatusLogError::VVMStatusDoesNotExist)
        );

        // After verifying VVMStatusDoesNotExist error,
        // insert a mock VVM status record to continue testing the other error cases
        VVMStatusRowRepository::new(&context.connection)
            .upsert_one(&VVMStatusRow {
                id: "vvm_status_id".to_string(),
                description: "VVM Stage 1 - Good".to_string(),
                code: "VVM1".to_string(),
                level: 1,
                is_active: true,
                unusable: false,
                reason_id: None,
            })
            .unwrap();

        // StockLineDoesNotExist
        // with a random stock line id
        assert_eq!(
            service.insert_vvm_status_log(
                &context,
                InsertVVMStatusLogInput {
                    id: "test_id".to_string(),
                    stock_line_id: "stock_line_id".to_string(),
                    status_id: "vvm_status_id".to_string(),
                    comment: Some("comment".to_string()),
                    invoice_line_id: "invoice_line_id".to_string(),
                },
            ),
            Err(InsertVVMStatusLogError::StockLineDoesNotExist)
        );

        // InvoiceLineDoesNotExist
        assert_eq!(
            service.insert_vvm_status_log(
                &context,
                InsertVVMStatusLogInput {
                    id: "test_id".to_string(),
                    stock_line_id: mock_stock_line_a().id.clone(),
                    status_id: "vvm_status_id".to_string(),
                    comment: Some("comment".to_string()),
                    invoice_line_id: "invoice_line_id".to_string(),
                },
            ),
            Err(InsertVVMStatusLogError::InvoiceLineDoesNotExist)
        );

        // After verifying InvoiceLineDoesNotExist error,
        // insert a mock invoice line record and start using mock_stock_line_a as the stock line id
        let invoice_line = mock_outbound_shipment_a_invoice_lines()[0].clone();
        InvoiceLineRowRepository::new(&context.connection)
            .upsert_one(&invoice_line)
            .unwrap();

        let input: InsertVVMStatusLogInput = InsertVVMStatusLogInput {
            id: "test_id".to_string(),
            stock_line_id: mock_stock_line_a().id.clone(),
            status_id: "vvm_status_id".to_string(),
            comment: Some("comment".to_string()),
            invoice_line_id: invoice_line.id.clone(),
        };

        // VVMStatusLogAlreadyExists
        service
            .insert_vvm_status_log(&context, input.clone())
            .unwrap();
        assert_eq!(
            service.insert_vvm_status_log(&context, input.clone()),
            Err(InsertVVMStatusLogError::VVMStatusLogAlreadyExists)
        );
    }

    #[actix_rt::test]
    async fn insert_vvm_status_log_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_vvm_status_log_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // Insert a mock invoice line record and using mock_stock_line_a as the stock line id
        let invoice_line = mock_outbound_shipment_a_invoice_lines()[0].clone();
        InvoiceLineRowRepository::new(&context.connection)
            .upsert_one(&invoice_line)
            .unwrap();

        let input = InsertVVMStatusLogInput {
            id: "vvm_status_log_id".to_string(),
            stock_line_id: mock_stock_line_a().id.clone(),
            status_id: "vvm_status_id".to_string(),
            comment: Some("comment".to_string()),
            invoice_line_id: invoice_line.id.clone(),
        };

        // Insert a mock VVM Status record
        VVMStatusRowRepository::new(&context.connection)
            .upsert_one(&VVMStatusRow {
                id: "vvm_status_id".to_string(),
                description: "VVM Stage 1 - Good".to_string(),
                code: "VVM1".to_string(),
                level: 1,
                is_active: true,
                unusable: false,
                reason_id: None,
            })
            .unwrap();

        let result = service_provider
            .vvm_service
            .insert_vvm_status_log(&context, input.clone())
            .unwrap();

        assert_eq!(result.id, "vvm_status_log_id");
    }
}
