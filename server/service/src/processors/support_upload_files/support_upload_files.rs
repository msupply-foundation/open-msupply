use async_trait::async_trait;
use repository::{
    ChangelogRow, ChangelogTableName, KeyType, SyncMessageRow, SyncMessageRowRepository,
    SyncMessageRowStatus, SyncMessageRowType,
};
use serde_json::Value;

use crate::{
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    static_files::{StaticFileCategory, StaticFileService},
    sync::CentralServerConfig,
};

pub struct SupportUploadFilesProcessor;

#[async_trait]
impl Processor for SupportUploadFilesProcessor {
    fn get_description(&self) -> String {
        "Support Upload Files Processor".to_string()
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let sync_message_repo = SyncMessageRowRepository::new(&ctx.connection);

        let sync_message = sync_message_repo
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| {
                ProcessorError::RecordNotFound(
                    "SyncMessage".to_string(),
                    changelog.record_id.clone(),
                )
            })?;

        if sync_message.r#type != SyncMessageRowType::SupportUpload
            || sync_message.status != SyncMessageRowStatus::New
        {
            return Ok(None);
        }

        let request_body: Value = serde_json::from_str(&sync_message.body)
            .map_err(|e| ProcessorError::OtherError(format!("Invalid JSON in body: {}", e)))?;

        let include_logs = request_body
            .get("logs")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let include_database = request_body
            .get("database")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        if include_logs {
            handle_log_files(ctx, service_provider, &sync_message)?;
        }

        if include_database {
            handle_database_file(service_provider, &sync_message)?;
        }

        sync_message_repo.upsert_one(&SyncMessageRow {
            status: SyncMessageRowStatus::Processed,
            ..sync_message.clone()
        })?;

        Ok(Some("success".to_string()))
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::SyncMessage]
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::SupportUploadFilesProcessorCursor)
    }

    fn should_run(&self) -> bool {
        CentralServerConfig::is_central_server()
    }
}

fn handle_log_files(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    sync_message: &repository::SyncMessageRow,
) -> Result<(), ProcessorError> {
    let server_settings = service_provider
        .settings
        .get_server_settings_info()
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

    let static_file_service = StaticFileService::new(&server_settings.base_dir)
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

    let log_file_names = service_provider
        .log_service
        .get_log_file_names(ctx)
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

    for file_name in log_file_names {
        let (_, log_content) = service_provider
            .log_service
            .get_log_content(ctx, Some(file_name.clone()))
            .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

        let log_content_string = log_content.join("\n");
        let log_bytes = log_content_string.as_bytes();

        static_file_service
            .store_file(
                &file_name,
                StaticFileCategory::SyncFile("sync_message".to_string(), sync_message.id.clone()),
                log_bytes,
            )
            .map_err(|e| ProcessorError::OtherError(e.to_string()))?;
    }

    Ok(())
}

fn handle_database_file(
    service_provider: &ServiceProvider,
    sync_message: &repository::SyncMessageRow,
) -> Result<(), ProcessorError> {
    let database_settings = service_provider
        .settings
        .get_database_info()
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

    let server_settings = service_provider
        .settings
        .get_server_settings_info()
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

    let database_path = database_settings.database_path();
    let database_bytes = std::fs::read(database_path).map_err(|e| {
        ProcessorError::OtherError(format!(
            "Failed to read database file at: {}",
            e.to_string()
        ))
    })?;

    let static_file_service = StaticFileService::new(&server_settings.base_dir).map_err(|e| {
        ProcessorError::OtherError(format!(
            "Failed to create StaticFileService at: {}",
            e.to_string()
        ))
    })?;

    static_file_service
        .store_file(
            &format!("{}.sqlite", &database_settings.database_name),
            StaticFileCategory::SyncFile("sync_message".to_string(), sync_message.id.clone()),
            &database_bytes,
        )
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

    Ok(())
}
