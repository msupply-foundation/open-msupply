use repository::{
    contact_form::{ContactForm, ContactFormFilter, ContactFormRepository},
    ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName, EqualFilter, KeyType,
    RepositoryError, TransactionError,
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
pub(crate) enum ProcessContactFormError {
    #[error("Contact form not found: {0:?}")]
    ContactFormNotFound(String),
    #[error("{0:?}")]
    DatabaseError(RepositoryError),
    #[error("{0:?}")]
    EmailServiceError(EmailServiceError),
}

const CHANGELOG_BATCH_SIZE: u32 = 20;

pub(crate) fn process_contact_forms(
    service_provider: &ServiceProvider,
) -> Result<(), ProcessContactFormError> {
    use ProcessContactFormError as Error;
    let processors: Vec<Box<dyn ContactFormProcessor>> = vec![Box::new(QueueContactEmailProcessor)];

    let ctx = service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;

    let changelog_repo = ChangelogRepository::new(&ctx.connection);
    let cursor_controller = CursorController::new(KeyType::ContactFormProcessorCursor);

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
            let result = process_change_log(&ctx, &log, &processors);
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
fn process_change_log(
    ctx: &ServiceContext,
    log: &ChangelogRow,
    processors: &[Box<dyn ContactFormProcessor>],
) -> Result<(), ProcessContactFormError> {
    use ProcessContactFormError as Error;
    let connection = &ctx.connection;

    let filter = ContactFormFilter::new().id(EqualFilter::equal_to(&log.record_id));

    let contact_forms = ContactFormRepository::new(connection)
        .query_by_filter(filter)
        .map_err(Error::DatabaseError)?;

    let contact_form = contact_forms
        .first()
        .ok_or(Error::ContactFormNotFound(log.record_id.clone()))?;

    // Try record against all of the processors
    for processor in processors.iter() {
        let result = processor.try_process_record_common(&ctx, &contact_form);
        if let Err(e) = result {
            log_system_error(connection, &e).map_err(Error::DatabaseError)?;
        }
    }
    Ok(())
}

trait ContactFormProcessor {
    fn get_description(&self) -> String;

    fn try_process_record_common(
        &self,
        ctx: &ServiceContext,
        contact_form: &ContactForm,
    ) -> Result<Option<String>, ProcessContactFormError> {
        let result = ctx
            .connection
            .transaction_sync(|_| self.try_process_record(ctx, contact_form))
            .map_err(ProcessContactFormError::from)?;

        if let Some(result) = &result {
            log::info!("{} - {}", self.get_description(), result);
        }

        Ok(result)
    }

    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        contact_form: &ContactForm,
    ) -> Result<Option<String>, ProcessContactFormError>;
}

impl From<TransactionError<ProcessContactFormError>> for ProcessContactFormError {
    fn from(error: TransactionError<ProcessContactFormError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                ProcessContactFormError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
