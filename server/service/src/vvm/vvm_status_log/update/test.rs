#[cfg(test)]
mod update {
    use repository::{
        mock::{mock_stock_line_a, mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
        vvm_status::vvm_status_row::{VVMStatusRow, VVMStatusRowRepository},
    };

    use crate::{
        service_provider::ServiceProvider,
        vvm::vvm_status_log::{
            insert::InsertVVMStatusLogInput,
            update::{UpdateVVMStatusLogError, UpdateVVMStatusLogInput},
        },
    };

    #[actix_rt::test]
    async fn update_vvm_status_log_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_vvm_status_log_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.vvm_service;
        let store_id = &mock_store_a().id;

        let input = UpdateVVMStatusLogInput {
            id: "vvm_status_log_id".to_string(),
            status_id: Some("vvm_status_id".to_string()),
            comment: Some("comment".to_string()),
        };

        // VVMStatusLogDoesNotExist
        assert_eq!(
            service.update_vvm_status_log(&context, store_id, input.clone()),
            Err(UpdateVVMStatusLogError::VVMStatusLogDoesNotExist)
        );

        // Insert a VVM status record
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

        // Insert a VVM Status Log Record
        service
            .insert_vvm_status_log(
                &context,
                store_id,
                InsertVVMStatusLogInput {
                    id: "vvm_status_log_id".to_string(),
                    stock_line_id: mock_stock_line_a().id.clone(),
                    status_id: "vvm_status_id".to_string(),
                    comment: Some("comment".to_string()),
                },
            )
            .unwrap();

        // VVMStatusDoesNotExist
        // Status ID doesn't exist
        assert_eq!(
            service.update_vvm_status_log(
                &context,
                store_id,
                UpdateVVMStatusLogInput {
                    id: "vvm_status_log_id".to_string(),
                    status_id: Some("vvm_status_id2".to_string()),
                    comment: Some("comment".to_string()),
                }
            ),
            Err(UpdateVVMStatusLogError::VVMStatusDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn update_vvm_status_log_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_vvm_status_log_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.vvm_service;
        let store_id = &mock_store_a().id;

        // Insert a VVM status record
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

        // Insert a VVM Status Log Record
        service
            .insert_vvm_status_log(
                &context,
                store_id,
                InsertVVMStatusLogInput {
                    id: "vvm_status_log_id".to_string(),
                    stock_line_id: mock_stock_line_a().id.clone(),
                    status_id: "vvm_status_id".to_string(),
                    comment: Some("comment".to_string()),
                },
            )
            .unwrap();

        let result = service
            .update_vvm_status_log(
                &context,
                store_id,
                UpdateVVMStatusLogInput {
                    id: "vvm_status_log_id".to_string(),
                    status_id: Some("vvm_status_id".to_string()),
                    comment: Some("updated_comment".to_string()),
                },
            )
            .unwrap();

        assert_eq!(result.id, "vvm_status_log_id");
    }
}
