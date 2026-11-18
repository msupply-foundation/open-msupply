use crate::{
    cursor_controller::CursorController,
    processors::{
        log_system_error,
        transfer::{
            get_linked_original_shipment, get_requisition_and_linked_requisition,
            invoice::{
                assign_invoice_number::AssignInvoiceNumberProcessor,
                create_inbound_invoice::CreateInboundInvoiceProcessor,
                delete_inbound_invoice::DeleteInboundInvoiceProcessor,
                link_outbound_invoice::LinkOutboundInvoiceProcessor,
                update_inbound_invoice::UpdateInboundInvoiceProcessor,
                update_outbound_invoice_status::UpdateOutboundInvoiceStatusProcessor,
                update_outbound_received_quantity::UpdateOutboundReceivedQuantityProcessor,
            },
        },
    },
    service_provider::{ServiceContext, ServiceProvider},
    sync::{ActiveStoresOnSite, GetActiveStoresOnSiteError},
};
use repository::{
    ChangelogCondition, ChangelogRepository, ChangelogRow, ChangelogTableName, CursorAndLimit,
    EqualFilter, FilterBuilder, Invoice, InvoiceFilter, InvoiceRepository, InvoiceRow,
    InvoiceRowRepository, InvoiceStatus, InvoiceType, KeyType, RepositoryError, Requisition,
    RowActionType, StorageConnection,
};
use thiserror::Error;

use super::{GetLinkedOriginalShipmentError, GetRequisitionAndLinkedRequisitionError};

pub(crate) mod assign_invoice_number;
pub(crate) mod common;
pub(crate) mod create_inbound_invoice;
pub(crate) mod delete_inbound_invoice;
pub(crate) mod link_outbound_invoice;
pub(crate) mod update_inbound_invoice;
pub(crate) mod update_outbound_invoice_status;
pub(crate) mod update_outbound_received_quantity;

#[cfg(test)]
mod stale_record_test;
#[cfg(test)]
pub(crate) mod test;

const CHANGELOG_BATCH_SIZE: u32 = 20;

#[derive(Clone, Debug)]
enum Operation {
    Delete {
        /// Linked invoice, where (changelog.record_id = linked_invoice.linked_invoice_id)
        linked_invoice: Option<Invoice>,
    },
    Upsert {
        invoice: Invoice,
        /// Linked invoice, both relations are checked
        /// (invoice.id = linked_invoice.linked_invoice_id OR invoice.linked_invoice_id = linked_invoice.id)
        linked_invoice: Option<Invoice>,
        /// Requisition for linked shipment, required for linking inbound shipment to request requisition
        /// could be Some() even if linked_shipment is None
        ///
        /// Deduced through:
        /// `shipment.requisition_id -> requisition.linked_requisition_id = linked_requisition.id`
        /// OR
        /// `shipment.requisition_id -> requisition.id -> linked_requisition.linked_requisition_id`
        linked_shipment_requisition: Option<Requisition>,
        /// Original shipment for linked return, required for linking customer return to outbound shipment
        /// Could be Some() even if linked_shipment (which is actually linked_return in this case...) is None
        /// because in/supplier return may not be linked to another return, but can be linked/connected to its
        /// original in/outbound shipment
        ///
        /// Deduced through:
        /// `return.original_shipment_id -> original_shipment.linked_invoice_id = linked_invoice.id`
        /// OR
        /// `return.original_shipment_id -> original_shipment.id -> linked_invoice.linked_invoice_id`
        linked_original_shipment: Option<Invoice>,
    },
}

#[derive(Clone, Debug)]
pub(crate) struct InvoiceTransferProcessorRecord {
    operation: Operation,
    other_party_store_id: String,
}

#[derive(Error, Debug)]
pub(crate) enum ProcessInvoiceTransfersError {
    #[error("Problem getting upsert operation {0}")]
    GetUpsertOperationError(GetUpsertOperationError),
    #[error("Problem getting delete operation {0}")]
    GetDeleteOperationError(RepositoryError),
    #[error("{0}")]
    GetActiveStoresOnSiteError(GetActiveStoresOnSiteError),
    #[error("{0:?}")]
    DatabaseError(RepositoryError),
    #[error("{0}")]
    ProcessorError(ProcessorError),
    #[error("Name id is missing from invoice changelog {0:?}")]
    NameIdIsMissingFromChangelog(ChangelogRow),
}

fn process_change_log(
    ctx: &ServiceContext,
    log: &ChangelogRow,
    processors: &[Box<dyn InvoiceTransferProcessor>],
    _active_stores: &ActiveStoresOnSite,
) -> Result<(), ProcessInvoiceTransfersError> {
    use ProcessInvoiceTransfersError as Error;
    let other_party_store_id = log
        .transfer_store_id
        .clone()
        .ok_or_else(|| Error::NameIdIsMissingFromChangelog(log.clone()))?;

    // Prepare record
    let operation =
        match &log.row_action {
            RowActionType::Upsert => get_upsert_operation(&ctx.connection, log)
                .map_err(Error::GetUpsertOperationError)?,
            RowActionType::Delete => get_delete_operation(&ctx.connection, log)
                .map_err(Error::GetDeleteOperationError)?,
        };

    // Legacy mSupply cancels a finalised invoice by saving a copy of it with is_cancellation set.
    // A cancellation is never half of a transfer: mSupply leaves the other store's half alone, and
    // so do we. Otherwise a cancelled customer invoice becomes a second inbound shipment, and a
    // cancelled supplier invoice is taken as the receipt of its outbound shipment.
    if let Operation::Upsert {
        invoice,
        linked_invoice,
        ..
    } = &operation
    {
        let linked_is_cancellation = linked_invoice
            .as_ref()
            .is_some_and(|linked| linked.invoice_row.is_cancellation);
        if invoice.invoice_row.is_cancellation || linked_is_cancellation {
            log::debug!(
                "Invoice transfer - skipped: invoice {} is or is linked to a cancellation",
                invoice.invoice_row.id
            );
            return Ok(());
        }
    }

    let record = InvoiceTransferProcessorRecord {
        operation,
        other_party_store_id,
    };

    // TODO: MERGE: Ignore if invoice name_id points to store's name. Supplying to itself! (Can happen with names are merge into stores)

    // Try record against all of the processors
    for processor in processors.iter() {
        let result = processor
            .try_process_record_common(ctx, &record)
            .map_err(Error::ProcessorError);
        if let Err(e) = result {
            log_system_error(&ctx.connection, &e).map_err(Error::DatabaseError)?;
        }
    }
    Ok(())
}

pub(crate) fn process_invoice_transfers(
    service_provider: &ServiceProvider,
) -> Result<(), ProcessInvoiceTransfersError> {
    use ProcessInvoiceTransfersError as Error;
    let processors: Vec<Box<dyn InvoiceTransferProcessor>> = vec![
        Box::new(CreateInboundInvoiceProcessor),
        Box::new(LinkOutboundInvoiceProcessor),
        Box::new(UpdateInboundInvoiceProcessor),
        Box::new(UpdateOutboundInvoiceStatusProcessor),
        Box::new(UpdateOutboundReceivedQuantityProcessor),
        Box::new(DeleteInboundInvoiceProcessor),
        Box::new(AssignInvoiceNumberProcessor),
    ];

    let ctx = &service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;

    let active_stores =
        ActiveStoresOnSite::get(&ctx.connection).map_err(Error::GetActiveStoresOnSiteError)?;

    let cursor_controller = CursorController::new(KeyType::ShipmentTransferProcessorCursor);
    // For transfers, changelog MUST be filtered by records where transfer_store_id is active store on this site
    // this is the contract obligation for try_process_record in ProcessorTrait
    let filter = ChangelogCondition::And(vec![
        ChangelogCondition::table_name::equal(ChangelogTableName::Invoice),
        ChangelogCondition::transfer_store_id::any(active_stores.store_ids()),
    ]);

    loop {
        let cursor = cursor_controller
            .get(&ctx.connection)
            .map_err(Error::DatabaseError)?;

        let logs = ChangelogRepository::new(&ctx.connection)
            .query(
                filter.clone(),
                CursorAndLimit {
                    cursor: cursor as i64,
                    limit: CHANGELOG_BATCH_SIZE as i64,
                },
            )
            .map_err(Error::DatabaseError)?
            .rows;

        if logs.is_empty() {
            break;
        }

        for log in logs {
            let result = process_change_log(ctx, &log, &processors, &active_stores);
            if let Err(e) = result {
                log_system_error(&ctx.connection, &e).map_err(Error::DatabaseError)?;
            }

            cursor_controller
                .update(&ctx.connection, log.cursor as u64)
                .map_err(Error::DatabaseError)?;
        }
    }

    Ok(())
}

#[derive(Error, Debug)]
pub(crate) enum GetUpsertOperationError {
    #[error("Invoice not found {0:?}")]
    InvoiceNotFound(ChangelogRow),
    #[error("Linked invoice not found {0:?}")]
    LinkedInvoiceNotFound(String),
    #[error("Database error while fetching invoice with id {0} {1:?}")]
    DatabaseError(String, RepositoryError),
    #[error("Error while fetching invoice operation {0:?} {1}")]
    GetRequisitionAndLinkedRequisitionError(ChangelogRow, GetRequisitionAndLinkedRequisitionError),
    #[error("Error while fetching invoice operation {0:?} {1}")]
    GetLinkedOriginalShipmentError(ChangelogRow, GetLinkedOriginalShipmentError),
}

fn get_upsert_operation(
    connection: &StorageConnection,
    changelog_row: &ChangelogRow,
) -> Result<Operation, GetUpsertOperationError> {
    use GetUpsertOperationError::*;
    let repo = InvoiceRepository::new(connection);

    let invoice = repo
        .query_one(InvoiceFilter::by_id(&changelog_row.record_id))
        .map_err(|e| DatabaseError(changelog_row.record_id.clone(), e))?
        .ok_or_else(|| InvoiceNotFound(changelog_row.clone()))?;

    let linked_invoice = match &invoice.invoice_row.linked_invoice_id {
        Some(id) => Some(
            repo.query_one(InvoiceFilter::by_id(id))
                .map_err(|e| DatabaseError(id.to_string(), e))?
                .ok_or_else(|| LinkedInvoiceNotFound(id.to_string()))?,
        ),
        // A legacy mSupply cancellation keeps the link of the invoice it cancels, so an outbound
        // shipment can have both a supplier invoice and its cancellation pointing at it. Only the
        // supplier invoice is the other half of the transfer.
        None => repo
            .query_one(
                InvoiceFilter::new_match_linked_invoice_id(&invoice.invoice_row.id)
                    .is_cancellation(false),
            )
            .map_err(|e| DatabaseError(invoice.invoice_row.id.clone(), e))?,
    };

    let linked_shipment_requisition = match &invoice.invoice_row.requisition_id {
        Some(requisition_id) => {
            let (_, linked_requisition) =
                get_requisition_and_linked_requisition(connection, requisition_id).map_err(
                    |e| GetRequisitionAndLinkedRequisitionError(changelog_row.clone(), e),
                )?;
            linked_requisition
        }
        None => None,
    };

    let linked_original_shipment = match &invoice.invoice_row.original_shipment_id {
        Some(original_shipment_id) => {
            get_linked_original_shipment(connection, original_shipment_id)
                .map_err(|e| GetLinkedOriginalShipmentError(changelog_row.clone(), e))?
        }
        None => None,
    };

    Ok(Operation::Upsert {
        invoice,
        linked_invoice,
        linked_shipment_requisition,
        linked_original_shipment,
    })
}

fn get_delete_operation(
    connection: &StorageConnection,
    changelog_row: &ChangelogRow,
) -> Result<Operation, RepositoryError> {
    let linked_invoice = InvoiceRepository::new(connection).query_one(
        InvoiceFilter::new()
            .linked_invoice_id(EqualFilter::equal_to(changelog_row.record_id.to_string()))
            .is_cancellation(false),
    )?;

    Ok(Operation::Delete { linked_invoice })
}
#[derive(Debug)]
#[allow(dead_code)] // The "Wrong" variants with fields don't use the fields yet. Be warned allowing dead_code here silences when we never use a particular variant as well.
enum InvoiceTransferOutput {
    // Success
    Processed(String),
    // Reasons for skipping
    BeforeInitialisationMonths,
    WrongOperation(Operation),
    WrongType(InvoiceType),
    WrongInboundStatus(InvoiceStatus),
    WrongOutboundStatus(InvoiceStatus),
    NoLinkedInvoice,
    InvoiceCreatedBeforeStore,
    InvoiceNumberAlreadyAllocated,
    AlreadyLinked,
    AlreadyVerified,
    StatusesAlreadyMatch,
}

#[derive(Error, Debug)]
#[error("Database error in processor ({0}) {1:?}")]
pub(crate) struct ProcessorError(String, RepositoryError);

trait InvoiceTransferProcessor {
    fn get_description(&self) -> String;

    fn try_process_record_common(
        &self,
        ctx: &ServiceContext,
        record: &InvoiceTransferProcessorRecord,
    ) -> Result<Option<String>, ProcessorError> {
        let output = ctx
            .connection
            .transaction_sync(|_| self.try_process_record(ctx, record))
            .map_err(|e| ProcessorError(self.get_description(), e.to_inner_error()))?;

        let result = match output {
            InvoiceTransferOutput::Processed(msg) => {
                log::info!("{} - processed: {}", self.get_description(), msg);
                Some(msg)
            }
            other => {
                log::debug!("{} - skipped: {:?}", self.get_description(), other);
                None
            }
        };

        Ok(result)
    }

    /// Caller MUST guarantee that source invoice.name_id is a store active on this site
    ///
    /// The record's invoices were read before this step's transaction, and before the steps that
    /// ran ahead of it on the same record, so the API or an earlier step may have changed them
    /// since. A step that writes an invoice re-reads and locks it here with `lock_invoice_row`,
    /// checks its conditions against that row and changes only the fields it owns. Writing back
    /// the record's copy would undo the newer change, e.g. put a shipped outbound back to Picked.
    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        record: &InvoiceTransferProcessorRecord,
    ) -> Result<InvoiceTransferOutput, RepositoryError>;
}

/// The invoice as it is now, for a step about to write it. The record's copy can be out of date,
/// see `try_process_record`. On Postgres the row stays locked until the step's transaction ends,
/// so nothing can change it between this read and the step's write. None if the invoice has been
/// deleted since the record was read.
fn lock_invoice_row(
    connection: &StorageConnection,
    invoice: &Invoice,
) -> Result<Option<InvoiceRow>, RepositoryError> {
    InvoiceRowRepository::new(connection).find_one_by_id_for_update(&invoice.invoice_row.id)
}
