use async_trait::async_trait;
use repository::{
    ChangelogRow, ChangelogTableName, KeyType, SyncMessageRowRepository, SyncMessageRowStatus,
    SyncMessageRowType,
};

use crate::{
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
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
        _service_provider: &ServiceProvider,
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

        // Parse configuration from body field
        let include_logs = sync_message.body.contains("logs");
        let include_database = sync_message.body.contains("database");

        let mut processed_files = Vec::new();

        if include_logs {
            log::info!("Processing log files for sync message: {}", sync_message.id);
            processed_files.push("logs");
        }

        if include_database {
            log::info!(
                "Processing database files for sync message: {}",
                sync_message.id
            );
            processed_files.push("database");
        }

        if processed_files.is_empty() {
            return Ok(Some("No files specified for download".to_string()));
        }

        // TODO: Update sync message status to Processed when done
        // sync_message_repo.update_status(&sync_message.id, SyncMessageRowStatus::Processed)?;

        Ok(Some(format!(
            "Processed support upload for: {}",
            processed_files.join(", ")
        )))
    }
}
