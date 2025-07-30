#[cfg(test)]
mod insert {
    use repository::{
        mock::{mock_stock_line_a, mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
        vvm_status::vvm_status_row::{VVMStatusRow, VVMStatusRowRepository},
        StockLineRowRepository,
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

        let store_id = &mock_store_a().id;

        // VVMStatusDoesNotExist
        assert_eq!(
            service.insert_vvm_status_log(
                &context,
                store_id,
                InsertVVMStatusLogInput {
                    id: "test_id".to_string(),
                    stock_line_id: "stock_line_id".to_string(),
                    status_id: "vvm_status_id".to_string(),
                    comment: Some("comment".to_string()),
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
                store_id,
                InsertVVMStatusLogInput {
                    id: "test_id".to_string(),
                    stock_line_id: "stock_line_id".to_string(),
                    status_id: "vvm_status_id".to_string(),
                    comment: Some("comment".to_string())
                },
            ),
            Err(InsertVVMStatusLogError::StockLineDoesNotExist)
        );

        // After verifying StockLineDoesNotExist error,
        // Use the mock_stock_line_a() to continue testing the other error cases
        let input: InsertVVMStatusLogInput = InsertVVMStatusLogInput {
            id: "test_id".to_string(),
            stock_line_id: mock_stock_line_a().id.clone(),
            status_id: "vvm_status_id".to_string(),
            comment: Some("comment".to_string()),
        };

        // VVMStatusLogAlreadyExists
        service
            .insert_vvm_status_log(&context, store_id, input.clone())
            .unwrap();
        assert_eq!(
            service.insert_vvm_status_log(&context, store_id, input.clone()),
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

        let store_id = &mock_store_a().id;

        let input = InsertVVMStatusLogInput {
            id: "vvm_status_log_id".to_string(),
            stock_line_id: mock_stock_line_a().id.clone(),
            status_id: "vvm_status_id".to_string(),
            comment: Some("comment".to_string()),
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
            .insert_vvm_status_log(&context, store_id, input.clone())
            .unwrap();

        assert_eq!(result.id, "vvm_status_log_id");

        // Check if the VVM Status Id is updated in the stock line
        let updated_stock_line = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&result.stock_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            updated_stock_line.vvm_status_id,
            Some(result.status_id.clone())
        );
    }
}
