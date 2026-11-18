pub(crate) mod create_response_requisition;
pub(crate) mod link_request_requisition;
pub(crate) mod update_request_requisition_approved_quantities;
pub(crate) mod update_request_requisition_status;

#[cfg(test)]
mod stale_record_test;
#[cfg(test)]
pub(crate) mod test;

use repository::{
    ChangelogCondition, ChangelogRepository, ChangelogRow, ChangelogTableName, CursorAndLimit,
    FilterBuilder, KeyType, RepositoryError, Requisition, RequisitionRow, RequisitionRowRepository,
    RowActionType, StorageConnection,
};
use thiserror::Error;

use crate::{
    cursor_controller::CursorController,
    processors::{
        log_system_error,
        transfer::{
            get_requisition_and_linked_requisition,
            requisition::{
                create_response_requisition::CreateResponseRequisitionProcessor,
                link_request_requisition::LinkRequestRequisitionProcessor,
                update_request_requisition_approved_quantities::UpdateRequestRequisitionApprovedQuantitiesProcessor,
                update_request_requisition_status::UpdateRequestRequisitionStatusProcessor,
            },
        },
    },
    service_provider::ServiceProvider,
    sync::{ActiveStoresOnSite, GetActiveStoresOnSiteError},
};

use super::GetRequisitionAndLinkedRequisitionError;

const CHANGELOG_BATCH_SIZE: u32 = 20;

#[derive(Clone, Debug)]
pub(crate) struct RequisitionTransferProcessorRecord {
    requisition: Requisition,
    /// Linked requisition, both relations are checked
    /// (requisition.id = linked_requisition.linked_requisition_id OR requisition.linked_requisition_id = requisition.id)
    linked_requisition: Option<Requisition>,
    other_party_store_id: String,
}

#[derive(Error, Debug)]
pub(crate) enum ProcessRequisitionTransfersError {
    #[error("Problem getting upsert record {0}")]
    GetRequisitionAndLinkedRequisitionError(GetRequisitionAndLinkedRequisitionError),
    #[error("{0}")]
    GetActiveStoresOnSiteError(GetActiveStoresOnSiteError),
    #[error("{0:?}")]
    DatabaseError(RepositoryError),
    #[error("{0}")]
    ProcessorError(ProcessorError),
    #[error("Name id is missing from requisition changelog {0:?}")]
    NameIdIsMissingFromChangelog(ChangelogRow),
}

fn process_change_log(
    connection: &StorageConnection,
    log: &ChangelogRow,
    processors: &[Box<dyn RequisitionTransferProcessor>],
    _active_stores: &ActiveStoresOnSite,
) -> Result<(), ProcessRequisitionTransfersError> {
    use ProcessRequisitionTransfersError as Error;
    let other_party_store_id = log
        .transfer_store_id
        .clone()
        .ok_or_else(|| Error::NameIdIsMissingFromChangelog(log.clone()))?;

    // Prepare record
    let (requisition, linked_requisition) = match &log.row_action {
        RowActionType::Upsert => get_requisition_and_linked_requisition(connection, &log.record_id)
            .map_err(Error::GetRequisitionAndLinkedRequisitionError)?,
        RowActionType::Delete => return Ok(()), // Nothing to do for deletes
    };

    let record = RequisitionTransferProcessorRecord {
        requisition,
        linked_requisition,
        other_party_store_id,
    };

    // Try record against all of the processors
    for processor in processors.iter() {
        processor
            .try_process_record_common(connection, &record)
            .map_err(Error::ProcessorError)?;
    }
    Ok(())
}

pub(crate) fn process_requisition_transfers(
    service_provider: &ServiceProvider,
) -> Result<(), ProcessRequisitionTransfersError> {
    use ProcessRequisitionTransfersError as Error;
    let processors: Vec<Box<dyn RequisitionTransferProcessor>> = vec![
        Box::new(CreateResponseRequisitionProcessor),
        Box::new(LinkRequestRequisitionProcessor),
        Box::new(UpdateRequestRequisitionApprovedQuantitiesProcessor),
        Box::new(UpdateRequestRequisitionStatusProcessor),
    ];

    let ctx = service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;

    let active_stores =
        ActiveStoresOnSite::get(&ctx.connection).map_err(Error::GetActiveStoresOnSiteError)?;

    let cursor_controller = CursorController::new(KeyType::RequisitionTransferProcessorCursor);
    // For transfers, changelog MUST be filtered by records where transfer_store_id is active store on this site
    // this is the contract obligation for try_process_record in ProcessorTrait
    let filter = ChangelogCondition::And(vec![
        ChangelogCondition::table_name::equal(ChangelogTableName::Requisition),
        ChangelogCondition::transfer_store_id::any(active_stores.store_ids()),
        // Filter out deletes
        ChangelogCondition::action::equal(RowActionType::Upsert),
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
            let result = process_change_log(&ctx.connection, &log, &processors, &active_stores);
            if let Err(e) = result {
                log_system_error(&ctx.connection, &e).map_err(Error::DatabaseError)?;
            }

            // Always update cursor and move on to the next log, even if there's an error
            cursor_controller
                .update(&ctx.connection, log.cursor as u64)
                .map_err(Error::DatabaseError)?;
        }
    }

    Ok(())
}

#[derive(Error, Debug)]
#[error("Database error in processor ({0}) {1:?}")]
pub(crate) struct ProcessorError(String, RepositoryError);

#[derive(Debug)]
enum RequisitionTransferOutput {
    // Success!!
    Processed(String),
    // Reasons for skipping
    NotRequest,
    NotSent,
    HasResponse,
    BeforeInitialisationMonths,
    NotResponse,
    NoLinkedRequisition,
    LinkedRequisitionNotLinked,
    RequestAlreadyApproved,
    ResponseNotApproved,
    RequestNotFinalised,
    ResponseNotFinalised,
}

trait RequisitionTransferProcessor {
    fn get_description(&self) -> String;

    fn try_process_record_common(
        &self,
        connection: &StorageConnection,
        record: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, ProcessorError> {
        let output = connection
            .transaction_sync(|connection| self.try_process_record(connection, record))
            .map_err(|e| ProcessorError(self.get_description(), e.to_inner_error()))?;

        let result = match output {
            RequisitionTransferOutput::Processed(msg) => {
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

    /// Caller MUST guarantee that record.requisition.name_id is a store active on this site
    ///
    /// The record's requisitions were read before this step's transaction, and before the steps
    /// that ran ahead of it on the same record, so the API or an earlier step may have changed
    /// them since. A step that writes a requisition re-reads and locks it here with
    /// `lock_requisition_row`, checks its conditions against that row and changes only the fields
    /// it owns. Writing back the record's copy would undo the newer change, e.g. finalising would
    /// drop the link and approval written just before.
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record: &RequisitionTransferProcessorRecord,
    ) -> Result<RequisitionTransferOutput, RepositoryError>;
}

/// The requisition as it is now, for a step about to write it. The record's copy can be out of
/// date, see `try_process_record`. On Postgres the row stays locked until the step's transaction
/// ends, so nothing can change it between this read and the step's write. None if the
/// requisition has been deleted since the record was read.
fn lock_requisition_row(
    connection: &StorageConnection,
    requisition: &Requisition,
) -> Result<Option<RequisitionRow>, RepositoryError> {
    RequisitionRowRepository::new(connection)
        .find_one_by_id_for_update(&requisition.requisition_row.id)
}
