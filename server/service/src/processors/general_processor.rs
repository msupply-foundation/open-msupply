use async_trait::async_trait;
use repository::{
    ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName, EqualFilter,
    PluginType, RepositoryError, TransactionError,
};
use strum::Display;
use thiserror::Error;

use crate::{
    backend_plugin::{
        plugin_provider::{PluginError, PluginInstance},
        types::processor,
    },
    cursor_controller::{CursorController, CursorType},
    email::EmailServiceError,
    processors::log_system_error,
    service_provider::{ServiceContext, ServiceProvider},
    sync::GetActiveStoresOnSiteError,
};

use super::{
    add_central_patient_visibility::AddPatientVisibilityForCentral,
    assign_requisition_number::AssignRequisitionNumber, contact_form::QueueContactEmailProcessor,
    load_plugin::LoadPlugin, plugin_processor::PluginProcessor,
    requisition_auto_finalise::RequisitionAutoFinaliseProcessor,
};

#[derive(Error, Debug)]
pub(crate) enum ProcessorError {
    #[error("{0} not found: {1}")]
    RecordNotFound(String, String),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("Error in email service {0:?}")]
    EmailServiceError(EmailServiceError),
    #[error("{0}")]
    GetActiveStoresOnSiteError(GetActiveStoresOnSiteError),
    #[error("Error in plugin processor, with input {0:?}")]
    PluginError(processor::Input, #[source] PluginError),
    #[error("Unexpected plugin result for input {0:?}")]
    PluginOutputMismatch(processor::Input),
    #[error("Other error: {0}")]
    OtherError(String),
}

const CHANGELOG_BATCH_SIZE: u32 = 20;

#[derive(Clone, Display)]
pub enum ProcessorType {
    ContactFormEmail,
    LoadPlugin,
    AssignRequisitionNumber,
    AddPatientVisibilityForCentral,
    Plugins,
    RequisitionAutoFinalise,
}

impl ProcessorType {
    pub(super) fn get_processors(&self) -> Vec<Box<dyn Processor>> {
        match self {
            // Using a vector because plugin processors are dynamic and multiple can be added
            ProcessorType::ContactFormEmail => vec![Box::new(QueueContactEmailProcessor)],
            ProcessorType::LoadPlugin => vec![Box::new(LoadPlugin)],
            ProcessorType::AssignRequisitionNumber => vec![Box::new(AssignRequisitionNumber)],
            ProcessorType::AddPatientVisibilityForCentral => {
                vec![Box::new(AddPatientVisibilityForCentral)]
            }
            ProcessorType::Plugins => get_plugin_processors(),
            ProcessorType::RequisitionAutoFinalise => {
                vec![Box::new(RequisitionAutoFinaliseProcessor)]
            }
        }
    }

    pub(super) fn get_description(&self) -> String {
        let processors = self.get_processors();

        if processors.is_empty() {
            return self.to_string();
        }
        processors
            .iter()
            .map(|p| p.get_description())
            .collect::<Vec<String>>()
            .join(", ")
    }
}

fn get_plugin_processors() -> Vec<Box<dyn Processor>> {
    PluginInstance::get_all(PluginType::Processor)
        .into_iter()
        .map(|p| Box::new(PluginProcessor(p)) as Box<dyn Processor>)
        .collect()
}

pub(crate) async fn process_records(
    service_provider: &ServiceProvider,
    r#type: ProcessorType,
) -> Result<(), ProcessorError> {
    use ProcessorError as Error;

    let processors = r#type.get_processors();

    for processor in processors {
        if !processor.should_run() {
            return Ok(());
        }

        let ctx = service_provider
            .basic_context()
            .map_err(Error::DatabaseError)?;
        let changelog_repo = ChangelogRepository::new(&ctx.connection);

        let cursor_controller = CursorController::from_cursor_type(processor.cursor_type());

        // Only process the changelogs we care about
        let filter = processor.changelogs_filter(&ctx)?;

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
                let result = processor
                    .try_process_record_common(&ctx, service_provider, &log)
                    .await;
                if let Err(e) = result {
                    log_system_error(&ctx.connection, &e).map_err(Error::DatabaseError)?;

                    if !processor.skip_on_error() {
                        break;
                    }
                }

                cursor_controller
                    .update(&ctx.connection, (log.cursor + 1) as u64)
                    .map_err(Error::DatabaseError)?;
            }
        }
    }
    Ok(())
}

#[async_trait]
pub(super) trait Processor: Sync + Send {
    fn get_description(&self) -> String;

    /// Default to using change_log_table_names
    fn changelogs_filter(&self, _ctx: &ServiceContext) -> Result<ChangelogFilter, ProcessorError> {
        Ok(ChangelogFilter::new().table_name(EqualFilter {
            equal_any: Some(self.change_log_table_names()),
            ..Default::default()
        }))
    }

    /// Default to empty array in case changelogs_filter is manually implemented
    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        Vec::new()
    }

    /// Extra check to see if processor should trigger, like if it's central for contact form email
    fn should_run(&self) -> bool {
        true
    }

    /// If there is a processor error, we skip the record and log in system log, for some processors
    /// this is not desired behavior. When skip_on_error is false, the processor driver will not
    /// skip the error and will log to system log, this may create a lot of system logs, one every time
    /// the processors are triggered, we are ok with that for now.
    fn skip_on_error(&self) -> bool {
        true
    }

    fn cursor_type(&self) -> CursorType;

    async fn try_process_record_common(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        // TODO: should be in a transaction, we need to support transaction_async
        let result = self
            .try_process_record(ctx, service_provider, changelog)
            .await?;

        if let Some(result) = &result {
            log::info!("{} - {}", self.get_description(), result);
        }

        Ok(result)
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
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
