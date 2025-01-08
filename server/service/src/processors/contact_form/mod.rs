use repository::{
    ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName, KeyType,
    RepositoryError, StorageConnection, TransactionError,
};
use thiserror::Error;

use crate::{
    cursor_controller::CursorController,
    email::EmailServiceError,
    processors::log_system_error,
    service_provider::{ServiceContext, ServiceProvider},
};

mod queue_email;

use queue_email::QueueContactEmailProcessor;

#[derive(Error, Debug)]
pub(crate) enum ProcessCentralRecordsError {
    #[error("{0:?} not found: {1:?}")]
    RecordNotFound(String, String),
    #[error("{0:?}")]
    DatabaseError(RepositoryError),
    #[error("{0:?}")]
    EmailServiceError(EmailServiceError),
}

const CHANGELOG_BATCH_SIZE: u32 = 20;

pub(crate) fn process_central_records(
    service_provider: &ServiceProvider,
) -> Result<(), ProcessCentralRecordsError> {
    use ProcessCentralRecordsError as Error;
    let processors: Vec<Box<dyn ContactFormProcessor>> = vec![Box::new(QueueContactEmailProcessor)];

    let ctx = service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;

    let changelog_repo = ChangelogRepository::new(&ctx.connection);
    let cursor_controller = CursorController::new(KeyType::ContactFormProcessorCursor);

    // Only process the changelogs we care about
    let filter = ChangelogFilter::new().table_name(ChangelogTableName::ContactForm.equal_to());

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
            for processor in processors.iter() {
                let result = processor.try_process_record_common(&ctx, &log);
                if let Err(e) = result {
                    log_system_error(&ctx.connection, &e).map_err(Error::DatabaseError)?;
                }
            }

            cursor_controller
                .update(&ctx.connection, (log.cursor + 1) as u64)
                .map_err(Error::DatabaseError)?;
        }
    }

    Ok(())
}

trait ContactFormProcessor {
    fn get_description(&self) -> String;

    fn try_process_record_common(
        &self,
        ctx: &ServiceContext,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessCentralRecordsError> {
        let result = ctx
            .connection
            .transaction_sync(|connection| self.try_process_record(connection, changelog))
            .map_err(ProcessCentralRecordsError::from)?;

        if let Some(result) = &result {
            log::info!("{} - {}", self.get_description(), result);
        }

        Ok(result)
    }

    fn try_process_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessCentralRecordsError>;
}

impl From<TransactionError<ProcessCentralRecordsError>> for ProcessCentralRecordsError {
    fn from(error: TransactionError<ProcessCentralRecordsError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                ProcessCentralRecordsError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
