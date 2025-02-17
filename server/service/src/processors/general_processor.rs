use repository::{
    ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName, EqualFilter, KeyType,
    RepositoryError, StorageConnection, TransactionError,
};
use thiserror::Error;

use crate::{
    cursor_controller::CursorController,
    email::EmailServiceError,
    processors::log_system_error,
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{contact_form::QueueContactEmailProcessor, load_plugin::LoadPlugin};

#[derive(Error, Debug)]
pub(crate) enum ProcessorError {
    #[error("{0} not found: {1}")]
    RecordNotFound(String, String),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("Error in email service {0:?}")]
    EmailServiceError(EmailServiceError),
}

const CHANGELOG_BATCH_SIZE: u32 = 20;

#[derive(Clone)]
pub enum ProcessorType {
    ContactFormEmail,
    LoadPlugin,
}

impl ProcessorType {
    pub(super) fn get_processor(&self) -> Box<dyn Processor> {
        match self {
            ProcessorType::ContactFormEmail => Box::new(QueueContactEmailProcessor),
            ProcessorType::LoadPlugin => Box::new(LoadPlugin),
        }
    }
}

pub(crate) fn process_records(
    service_provider: &ServiceProvider,
    r#type: ProcessorType,
) -> Result<(), ProcessorError> {
    use ProcessorError as Error;

    let processor = r#type.get_processor();
    if !processor.should_run() {
        return Ok(());
    }

    let ctx = service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;
    let changelog_repo = ChangelogRepository::new(&ctx.connection);

    let cursor_controller = CursorController::new(processor.cursor_type());

    // Only process the changelogs we care about
    let filter = processor.changelogs_filter();

    loop {
        let cursor = cursor_controller
            .get(&ctx.connection)
            .map_err(Error::DatabaseError)?;

        let logs = changelog_repo
            .changelogs(cursor, CHANGELOG_BATCH_SIZE, Some(filter.clone()))
            .map_err(Error::DatabaseError)?;

        if logs.is_empty() {
            break;
        }

        for log in logs {
            // Try record against all of the processors
            let result = processor.try_process_record_common(&ctx, &log);
            if let Err(e) = result {
                log_system_error(&ctx.connection, &e).map_err(Error::DatabaseError)?;
            }
            cursor_controller
                .update(&ctx.connection, (log.cursor + 1) as u64)
                .map_err(Error::DatabaseError)?;
        }
    }

    Ok(())
}

pub(super) trait Processor {
    fn get_description(&self) -> String;
    /// Default to using change_log_table_names
    fn changelogs_filter(&self) -> ChangelogFilter {
        ChangelogFilter::new().table_name(EqualFilter {
            equal_any: Some(self.change_log_table_names()),
            ..Default::default()
        })
    }

    /// Default to empty array in case chanelogs_filter is manually implemented
    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        Vec::new()
    }

    /// Extra check to see if processor should trigger, like if it's central for contact form email
    fn should_run(&self) -> bool {
        true
    }

    fn cursor_type(&self) -> KeyType;

    fn try_process_record_common(
        &self,
        ctx: &ServiceContext,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        let result = ctx
            .connection
            .transaction_sync(|connection| self.try_process_record(connection, changelog))
            .map_err(ProcessorError::from)?;

        if let Some(result) = &result {
            log::info!("{} - {}", self.get_description(), result);
        }

        Ok(result)
    }

    fn try_process_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError>;
}

impl From<TransactionError<ProcessorError>> for ProcessorError {
    fn from(error: TransactionError<ProcessorError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                ProcessorError::DatabaseError(RepositoryError::TransactionError { msg, level })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
