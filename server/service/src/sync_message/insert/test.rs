#[cfg(test)]
mod insert {
    use repository::{
        mock::{mock_store_a, mock_store_b, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
        SyncMessageRowRepository, SyncMessageRowStatus, SyncMessageRowType,
    };

    use crate::{
        service_provider::ServiceProvider,
        sync_message::insert::{InsertSyncMessageError, InsertSyncMessageInput},
    };

    #[actix_rt::test]
    async fn insert_sync_message_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_sync_message_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.sync_message_service;

        // ToStoreDoesNotExist
        assert_eq!(
            service.insert_sync_message(
                &context,
                InsertSyncMessageInput {
                    id: "sync_message_id".to_string(),
                    to_store_id: Some("non_existent_store".to_string()),
                    body: Some("test body".to_string()),
                    r#type: SyncMessageRowType::RequestFieldChange,
                }
            ),
            Err(InsertSyncMessageError::ToStoreDoesNotExist)
        );

        // SyncMessageAlreadyExists
        service
            .insert_sync_message(
                &context,
                InsertSyncMessageInput {
                    id: "sync_message_id".to_string(),
                    to_store_id: Some(mock_store_b().id.to_string()),
                    body: Some("test body".to_string()),
                    r#type: SyncMessageRowType::RequestFieldChange,
                },
            )
            .unwrap();

        assert_eq!(
            service.insert_sync_message(
                &context,
                InsertSyncMessageInput {
                    id: "sync_message_id".to_string(),
                    to_store_id: Some(mock_store_b().id.to_string()),
                    body: Some("test body".to_string()),
                    r#type: SyncMessageRowType::RequestFieldChange,
                }
            ),
            Err(InsertSyncMessageError::SyncMessageAlreadyExists)
        );
    }

    #[actix_rt::test]
    async fn insert_sync_message_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_sync_message_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.sync_message_service;

        let result = service
            .insert_sync_message(
                &context,
                InsertSyncMessageInput {
                    id: "sync_message_id".to_string(),
                    to_store_id: Some(mock_store_b().id.to_string()),
                    body: Some("test body 1".to_string()),
                    r#type: SyncMessageRowType::RequestFieldChange,
                },
            )
            .unwrap();

        // Verify the sync messages were created correctly in the repository
        let sync_message = SyncMessageRowRepository::new(&context.connection)
            .find_one_by_id("sync_message_id")
            .unwrap()
            .unwrap();

        assert_eq!(result.id, sync_message.id);
        assert_eq!(result.to_store_id, Some(mock_store_b().id.to_string()));
        assert_eq!(result.from_store_id, Some(mock_store_a().id.to_string()));
        assert_eq!(result.body, "test body 1".to_string());
        assert_eq!(result.r#type, SyncMessageRowType::RequestFieldChange);
        assert_eq!(result.status, SyncMessageRowStatus::New);
        assert!(result.error_message.is_none());
    }
}
