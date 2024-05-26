use crate::{
    cursor_controller::CursorController,
    processors::transfer::{
        get_linked_original_shipment, get_requisition_and_linked_requisition,
        invoice::{
            assign_invoice_number::AssignInvoiceNumberProcessor,
            create_inbound_invoice::CreateInboundInvoiceProcessor,
            delete_inbound_invoice::DeleteInboundInvoiceProcessor,
            link_outbound_invoice::LinkOutboundInvoiceProcessor,
            update_inbound_invoice::UpdateInboundInvoiceProcessor,
            update_outbound_invoice_status::UpdateOutboundInvoiceStatusProcessor,
        },
    },
    service_provider::ServiceProvider,
    sync::{ActiveStoresOnSite, GetActiveStoresOnSiteError},
};
use repository::{
    ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName, EqualFilter, Invoice,
    InvoiceFilter, InvoiceRepository, KeyType, RepositoryError, Requisition, RowActionType,
    StorageConnection,
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

#[cfg(test)]
#[cfg(not(feature = "memory"))]
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
        /// Original shipment for linked return, required for linking inbound return to outbound shipment
        /// Could be Some() even if linked_shipment (which is actually linked_return in this case...) is None
        /// because in/outbound return may not be linked to another return, but can be linked/connected to its
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
    #[error("Name is not an active store {0:?}")]
    NameIsNotAnActiveStore(ChangelogRow),
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
        Box::new(DeleteInboundInvoiceProcessor),
        Box::new(AssignInvoiceNumberProcessor),
    ];

    let ctx = service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;

    let active_stores =
        ActiveStoresOnSite::get(&ctx.connection).map_err(Error::GetActiveStoresOnSiteError)?;

    let changelog_repo = ChangelogRepository::new(&ctx.connection);
    let cursor_controller = CursorController::new(KeyType::ShipmentTransferProcessorCursor);
    // For transfers, changelog MUST be filtered by records where name_id is active store on this site
    // this is the contract obligation for try_process_record in ProcessorTrait
    let filter = ChangelogFilter::new()
        .table_name(ChangelogTableName::Invoice.equal_to())
        .name_id(EqualFilter::equal_any(active_stores.name_ids().clone()));

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
            let name_id = log
                .name_id
                .as_ref()
                .ok_or_else(|| Error::NameIdIsMissingFromChangelog(log.clone()))?;

            // Prepare record
            let operation = match &log.row_action {
                RowActionType::Upsert => get_upsert_operation(&ctx.connection, &log)
                    .map_err(Error::GetUpsertOperationError)?,
                RowActionType::Delete => get_delete_operation(&ctx.connection, &log)
                    .map_err(Error::GetDeleteOperationError)?,
            };

            let record = InvoiceTransferProcessorRecord {
                operation,
                other_party_store_id: active_stores
                    .get_store_id_for_name_id(name_id)
                    .ok_or_else(|| Error::NameIsNotAnActiveStore(log.clone()))?,
            };

            // TODO: MERGE: Ignore if invoice name_link_id points to store's name. Supplying to itself! (Can happen with names are merge into stores)

            // Try record against all of the processors
            for processor in processors.iter() {
                processor
                    .try_process_record_common(&ctx.connection, &record)
                    .map_err(Error::ProcessorError)?;
            }

            cursor_controller
                .update(&ctx.connection, (log.cursor + 1) as u64)
                .map_err(Error::DatabaseError)?;
        }
    }

    Ok(())
}

#[derive(Error, Debug)]
pub(crate) enum GetUpsertOperationError {
    #[error("Invoice not found {0:?}")]
    InvoiceNotFound(ChangelogRow),
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
        Some(id) => repo
            .query_one(InvoiceFilter::by_id(id))
            .map_err(|e| DatabaseError(id.to_string(), e))?,
        None => repo
            .query_one(InvoiceFilter::new_match_linked_invoice_id(
                &invoice.invoice_row.id,
            ))
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
            let linked_original_shipment =
                get_linked_original_shipment(connection, original_shipment_id)
                    .map_err(|e| GetLinkedOriginalShipmentError(changelog_row.clone(), e))?;
            linked_original_shipment
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
        InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(&changelog_row.record_id)),
    )?;

    Ok(Operation::Delete { linked_invoice })
}

#[derive(Error, Debug)]
#[error("Database error in processor ({0}) {1:?}")]
pub(crate) struct ProcessorError(String, RepositoryError);

trait InvoiceTransferProcessor {
    fn get_description(&self) -> String;

    fn try_process_record_common(
        &self,
        connection: &StorageConnection,
        record: &InvoiceTransferProcessorRecord,
    ) -> Result<Option<String>, ProcessorError> {
        let result = connection
            .transaction_sync(|connection| self.try_process_record(connection, record))
            .map_err(|e| ProcessorError(self.get_description(), e.to_inner_error()))?;

        if let Some(result) = &result {
            log::info!("{} - {}", self.get_description(), result);
        }

        Ok(result)
    }

    /// Caller MUST guarantee that source invoice.name_id is a store active on this site
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record: &InvoiceTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError>;
}
