use async_trait::async_trait;
use repository::{
    ChangelogRow, ChangelogTableName, KeyType, KeyValueStoreRepository, StoreRowRepository,
    SyncMessageRow, SyncMessageRowRepository, SyncMessageRowStatus, SyncMessageRowType,
};
use serde_json::Value;

use crate::{
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    static_files::{StaticFileCategory, StaticFileService},
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

        if !is_to_store_on_this_site(ctx, &sync_message.to_store_id)? {
            return Ok(None);
        }

        if sync_message.r#type != SyncMessageRowType::SupportUpload
            || sync_message.status != SyncMessageRowStatus::New
        {
            return Ok(None);
        }

        let request_body: Value = serde_json::from_str(&sync_message.body).map_err(|e| {
            ProcessorError::OtherError(format!(
                "(support upload): Invalid JSON in body: {} - {}",
                sync_message.body, e
            ))
        })?;

        log::info!(
            "Processing support upload files for sync message id: {} with body: {}",
            sync_message.id,
            request_body
        );

        let process_logs = request_body
            .get("logs")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let process_database = request_body
            .get("database")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        if process_logs {
            log::info!(
                "Processing log files for sync message id: {}",
                sync_message.id
            );
            process_log_files(ctx, service_provider, &sync_message)?;
        }

        if process_database {
            log::info!(
                "Processing database file for sync message id: {}",
                sync_message.id
            );
            process_database_files(service_provider, &sync_message)?;
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
}

fn is_to_store_on_this_site(
    ctx: &ServiceContext,
    to_store_id: &Option<String>,
) -> Result<bool, ProcessorError> {
    let sync_site_id =
        KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;

    if let Some(to_store_id) = to_store_id {
        let store = StoreRowRepository::new(&ctx.connection).find_one_by_id(to_store_id)?;
        if let Some(store) = store {
            return Ok(sync_site_id == Some(store.site_id));
        }
    }

    Ok(false)
}

fn process_log_files(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    sync_message: &SyncMessageRow,
) -> Result<(), ProcessorError> {
    let server_settings = service_provider
        .settings
        .get_server_settings_info()
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_log_files) Failed to get server settings: {}",
                e.to_string()
            ))
        })?;

    let static_file_service = StaticFileService::new(&server_settings.base_dir).map_err(|e| {
        ProcessorError::OtherError(format!(
            "(process_log_files) Failed to create StaticFileService: {}",
            e.to_string()
        ))
    })?;

    let log_file_names = service_provider
        .log_service
        .get_log_file_names(ctx)
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_log_files) Failed to get log file names: {}",
                e.to_string()
            ))
        })?;

    for file_name in log_file_names {
        let (_, log_content) = service_provider
            .log_service
            .get_log_content(ctx, Some(file_name.clone()))
            .map_err(|e| {
                ProcessorError::OtherError(format!(
                    "(process_log_files) Failed to get log content for file '{}': {}",
                    file_name,
                    e.to_string()
                ))
            })?;

        let log_content_string = log_content.join("\n");
        let log_bytes = log_content_string.as_bytes();

        static_file_service
            .store_file(
                &file_name,
                StaticFileCategory::SyncFile("sync_message".to_string(), sync_message.id.clone()),
                log_bytes,
            )
            .map_err(|e| {
                ProcessorError::OtherError(format!(
                    "(process_log_files) Failed to store log file '{}': {}",
                    file_name,
                    e.to_string()
                ))
            })?;
    }

    Ok(())
}

fn process_database_files(
    service_provider: &ServiceProvider,
    sync_message: &SyncMessageRow,
) -> Result<(), ProcessorError> {
    let database_settings = service_provider.settings.get_database_info().map_err(|e| {
        ProcessorError::OtherError(format!(
            "(process_database_files) Failed to get database settings: {}",
            e.to_string()
        ))
    })?;

    let server_settings = service_provider
        .settings
        .get_server_settings_info()
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_database_files) Failed to get server settings: {}",
                e.to_string()
            ))
        })?;

    let database_path = database_settings.database_path();
    let database_bytes = std::fs::read(database_path).map_err(|e| {
        ProcessorError::OtherError(format!(
            "(process_database_files) Failed to read database file at: {}",
            e.to_string()
        ))
    })?;

    let static_file_service = StaticFileService::new(&server_settings.base_dir).map_err(|e| {
        ProcessorError::OtherError(format!(
            "(process_database_files) Failed to create StaticFileService at: {}",
            e.to_string()
        ))
    })?;

    static_file_service
        .store_file(
            "uploaded-database.sqlite",
            StaticFileCategory::SyncFile("sync_message".to_string(), sync_message.id.clone()),
            &database_bytes,
        )
        .map_err(|e| {
            ProcessorError::OtherError(format!(
                "(process_database_files) Failed to store database file: {}",
                e.to_string()
            ))
        })?;

    Ok(())
}
