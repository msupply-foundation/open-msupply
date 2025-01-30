use repository::{ChangelogRow, ChangelogTableName, KeyType, StorageConnection};

use crate::processors::general_processor::{Processor, ProcessorError};

const DESCRIPTION: &str = "Load plugins";

pub(crate) struct LoadPlugin;

impl Processor for LoadPlugin {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Only runs once because contact form is create only
    /// Changelog will only be processed once
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        Ok(Some("success".to_string()))
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::BackendPlugin]
    }

    fn cursor_type(&self) -> KeyType {
        KeyType::ContactFormProcessorCursor
    }
}
