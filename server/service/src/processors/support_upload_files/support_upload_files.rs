use async_trait::async_trait;
use repository::{
    ChangelogRow, ChangelogTableName, KeyType, SyncMessageRow, SyncMessageRowRepository,
    SyncMessageRowStatus, SyncMessageRowType,
};

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

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::SyncMessage]
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::SuppportUploadFilesProcessorCursor)
    }

    fn should_run(&self) -> bool {
        CentralServerConfig::is_central_server()
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

        let include_logs = sync_message.body.contains("logs");
        let include_database = sync_message.body.contains("database");

        if include_logs {
            log::info!("Processing log files for sync message: {}", sync_message.id);
            handle_log_files(ctx, service_provider, &sync_message)?;
        }

        if include_database {
            log::info!("Processing database file: {}", sync_message.id);
            handle_database_file(service_provider, &sync_message)?;
        }

        sync_message_repo.upsert_one(&SyncMessageRow {
            status: SyncMessageRowStatus::Processed,
            ..sync_message.clone()
        })?;

        Ok(Some(format!(
            "Processed support upload files for sync message: {}",
            sync_message.id
        )))
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

        let stored_file = static_file_service
            .store_file(
                &file_name,
                StaticFileCategory::SyncFile(
                    "sync_message_logs".to_string(),
                    sync_message.id.clone(),
                ),
                log_bytes,
            )
            .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

        log::info!("Log file stored: {} ({})", file_name, stored_file.id);
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

    let database_path = database_settings
        .database_path
        .as_ref()
        .ok_or_else(|| ProcessorError::OtherError("Database path not configured".into()))?;

    let database_bytes =
        std::fs::read(database_path).map_err(|e| ProcessorError::OtherError(e.to_string()))?;
    let static_file_service = StaticFileService::new(&server_settings.base_dir)
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

    let stored_file = static_file_service
        .store_file(
            &database_settings.database_name,
            StaticFileCategory::SyncFile(
                "sync_message_database".to_string(),
                sync_message.id.clone(),
            ),
            &database_bytes,
        )
        .map_err(|e| ProcessorError::OtherError(e.to_string()))?;

    log::info!("Database stored: {}", stored_file.id);
    Ok(())
}
