use crate::{
    cursor_controller::CursorController,
    processors::log_system_error,
    service_provider::ServiceProvider,
    sync::{ActiveStoresOnSite, GetActiveStoresOnSiteError},
};
use repository::{
    ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName, EqualFilter, KeyType,
    RepositoryError, RowActionType, StorageConnection,
};
use thiserror::Error;

pub(crate) mod update_inbound_invoice_line;

use update_inbound_invoice_line::UpdateInboundInvoiceLineProcessor;

const CHANGELOG_BATCH_SIZE: u32 = 50;

#[derive(Clone, Debug)]
pub(crate) struct InvoiceLineTransferProcessorRecord {
    pub operation: RowActionType,
    pub invoice_id: String,
    pub invoice_store_id: String,
    pub invoice_line_id: String,
    pub other_party_store_id: String,
}

#[derive(Error, Debug)]
pub(crate) enum ProcessInvoiceLineTransfersError {
    #[error("{0:?}")]
    DatabaseError(#[from] RepositoryError),
    #[error("{0}")]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
    #[error("{0}")]
    ProcessorError(ProcessorError),
    #[error("Name id is missing from invoice line changelog {0:?}")]
    NameIdIsMissingFromChangelog(ChangelogRow),
    #[error("Name is not an active store {0:?}")]
    NameIsNotAnActiveStore(ChangelogRow),
}

#[derive(Debug)]
pub(crate) enum InvoiceLineTransferOutput {
    Processed(String),
    WrongOperation,
    WrongInvoiceType,
    WrongInvoiceStatus,
    WrongStoreInvoice(#[allow(dead_code)] String),
    InboundNotEditable,
    NoLinkedInvoice,
}

#[derive(Error, Debug)]
#[error("Database error in processor ({0}) {1:?}")]
pub(crate) struct ProcessorError(String, RepositoryError);

pub(crate) trait InvoiceLineTransferProcessor: Send + Sync {
    fn get_description(&self) -> String;

    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record: &InvoiceLineTransferProcessorRecord,
    ) -> Result<InvoiceLineTransferOutput, RepositoryError>;
}

fn get_processors() -> Vec<Box<dyn InvoiceLineTransferProcessor>> {
    vec![Box::new(UpdateInboundInvoiceLineProcessor)]
}

fn process_change_log(
    connection: &StorageConnection,
    log: &ChangelogRow,
    processors: &[Box<dyn InvoiceLineTransferProcessor>],
    active_stores: &ActiveStoresOnSite,
) -> Result<(), ProcessInvoiceLineTransfersError> {
    use ProcessInvoiceLineTransfersError as Error;

    let name_id = log
        .name_id
        .as_ref()
        .ok_or_else(|| Error::NameIdIsMissingFromChangelog(log.clone()))?;

    let record = InvoiceLineTransferProcessorRecord {
        operation: log.row_action.clone(),
        invoice_id: log.invoice_id.clone().unwrap_or_default(),
        invoice_store_id: log.store_id.clone().unwrap_or_default(),
        invoice_line_id: log.record_id.clone(),
        other_party_store_id: active_stores
            .get_store_id_for_name_id(name_id)
            .ok_or_else(|| Error::NameIsNotAnActiveStore(log.clone()))?,
    };

    // Try record against all processors
    for processor in processors.iter() {
        let output = connection
            .transaction_sync(|connection| processor.try_process_record(connection, &record))
            .map_err(|e| ProcessorError(processor.get_description(), e.to_inner_error()))
            .map_err(Error::ProcessorError)?;

        match output {
            InvoiceLineTransferOutput::Processed(result) => {
                log::info!(
                    "Processor ({}) processed invoice line ({}): {}",
                    processor.get_description(),
                    log.record_id,
                    result
                );
                break;
            }
            _ => continue, // Try next processor
        }
    }
    Ok(())
}

pub(crate) fn process_invoice_line_transfers(
    service_provider: &ServiceProvider,
) -> Result<(), ProcessInvoiceLineTransfersError> {
    use ProcessInvoiceLineTransfersError as Error;

    let processors = get_processors();
    let ctx = service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;

    let active_stores = ActiveStoresOnSite::get(&ctx.connection)?;

    let changelog_repo = ChangelogRepository::new(&ctx.connection);
    let cursor_controller = CursorController::new(KeyType::InvoiceLineTransferProcessorCursor);

    let filter = ChangelogFilter::new()
        .table_name(ChangelogTableName::InvoiceLine.equal_to())
        .name_id(EqualFilter::equal_any(active_stores.name_ids().clone()));

    loop {
        let cursor = cursor_controller.get(&ctx.connection)?;
        let logs = changelog_repo.changelogs(cursor, CHANGELOG_BATCH_SIZE, Some(filter.clone()))?;

        if logs.is_empty() {
            break;
        }

        for log in logs.iter() {
            let result = process_change_log(&ctx.connection, &log, &processors, &active_stores);

            if let Err(e) = result {
                log_system_error(&ctx.connection, &e).map_err(Error::DatabaseError)?;
            }

            cursor_controller.update(&ctx.connection, (log.cursor + 1) as u64)?;
        }
    }

    Ok(())
}
