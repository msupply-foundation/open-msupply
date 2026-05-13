#[cfg(test)]
mod test;

use async_trait::async_trait;
use repository::{
    ChangelogCondition, ChangelogRow, ChangelogTableName, FilterBuilder, KeyType, SyncMessageRow,
    SyncMessageRowRepository, SyncMessageRowStatus, SyncMessageRowType,
};

use crate::{
    cursor_controller::CursorType,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        translation_and_integration::integrate,
        translations::special::merge::{apply_merge, MergeOutcome, MergeSyncMessageBody},
        CentralServerConfig,
    },
};

const DESCRIPTION: &str = "Apply name/item/clinician merge from sync_message";

pub(crate) struct MergeSyncMessageProcessor;

#[async_trait]
impl Processor for MergeSyncMessageProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    fn changelogs_filter(
        &self,
        _ctx: &ServiceContext,
    ) -> Result<ChangelogCondition::Inner, ProcessorError> {
        Ok(ChangelogCondition::table_name::equal(
            ChangelogTableName::SyncMessage,
        ))
    }

    /// Central applies the merge directly during sync translation, so the
    /// processor only does work on remote sites.
    fn should_run(&self) -> bool {
        !CentralServerConfig::is_central_server()
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::MergeSyncMessageProcessorCursor)
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let repo = SyncMessageRowRepository::new(&ctx.connection);
        let Some(message) = repo.find_one_by_id(&changelog.record_id)? else {
            return Ok(None);
        };

        if message.r#type != SyncMessageRowType::Merge {
            return Ok(None);
        }

        if message.status == SyncMessageRowStatus::Processed {
            return Ok(None);
        }

        let body: MergeSyncMessageBody = serde_json::from_str(&message.body).map_err(|e| {
            ProcessorError::OtherError(format!(
                "Invalid merge message body for {}: {e}",
                message.id
            ))
        })?;

        let outcome = apply_merge(&ctx.connection, &body)
            .map_err(|e| ProcessorError::OtherError(format!("Merge failed for {}: {e}", message.id)))?;

        let summary = match outcome {
            MergeOutcome::Operations(ops) => {
                let count = ops.len();
                let records: Vec<(Option<i32>, _)> = ops.into_iter().map(|op| (None, op)).collect();
                integrate(&ctx.connection, &records)?;
                format!("applied {count} operations")
            }
            MergeOutcome::NothingToDo(reason) => reason.to_string(),
        };

        // Mark message as processed
        let processed = SyncMessageRow {
            status: SyncMessageRowStatus::Processed,
            error_message: None,
            ..message.clone()
        };
        repo.upsert_one(&processed)?;

        Ok(Some(format!("merge {} ({summary})", message.id)))
    }
}
