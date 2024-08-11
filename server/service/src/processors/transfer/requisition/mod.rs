pub(crate) mod assign_requisition_number;
pub(crate) mod create_response_requisition;
pub(crate) mod link_request_requisition;
pub(crate) mod update_request_requisition_approved_quantities;
pub(crate) mod update_request_requisition_status;

#[cfg(test)]
#[cfg(not(feature = "memory"))]
pub(crate) mod test;

use repository::{
    ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName, EqualFilter, KeyType,
    RepositoryError, Requisition, RowActionType, StorageConnection,
};
use thiserror::Error;

use crate::{
    cursor_controller::CursorController,
    processors::transfer::{
        get_requisition_and_linked_requisition,
        requisition::{
            assign_requisition_number::AssignRequisitionNumberProcessor,
            create_response_requisition::CreateResponseRequisitionProcessor,
            link_request_requisition::LinkRequestRequisitionProcessor,
            update_request_requisition_status::UpdateRequestRequisitionStatusProcessor,
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
    #[error("Name is not an active store {0:?}")]
    NameIsNotAnActiveStore(ChangelogRow),
}

pub(crate) fn process_requisition_transfers(
    service_provider: &ServiceProvider,
) -> Result<(), ProcessRequisitionTransfersError> {
    use ProcessRequisitionTransfersError as Error;
    let processors: Vec<Box<dyn RequisitionTransferProcessor>> = vec![
        Box::new(CreateResponseRequisitionProcessor),
        Box::new(LinkRequestRequisitionProcessor),
        Box::new(UpdateRequestRequisitionStatusProcessor),
        Box::new(AssignRequisitionNumberProcessor),
    ];

    let ctx = service_provider
        .basic_context()
        .map_err(Error::DatabaseError)?;

    let active_stores =
        ActiveStoresOnSite::get(&ctx.connection).map_err(Error::GetActiveStoresOnSiteError)?;

    let changelog_repo = ChangelogRepository::new(&ctx.connection);
    let cursor_controller = CursorController::new(KeyType::RequisitionTransferProcessorCursor);
    // For transfers, changelog MUST be filtered by records where name_id is active store on this site
    // this is the contract obligation for try_process_record in ProcessorTrait
    let filter = ChangelogFilter::new()
        .table_name(ChangelogTableName::Requisition.equal_to())
        .name_id(EqualFilter::equal_any(active_stores.name_ids()))
        // Filter out deletes
        .action(RowActionType::Upsert.equal_to());

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
            let (requisition, linked_requisition) = match &log.row_action {
                RowActionType::Upsert => {
                    get_requisition_and_linked_requisition(&ctx.connection, &log.record_id)
                        .map_err(Error::GetRequisitionAndLinkedRequisitionError)?
                }
                RowActionType::Delete => continue,
            };

            let record = RequisitionTransferProcessorRecord {
                requisition,
                linked_requisition,
                other_party_store_id: active_stores
                    .get_store_id_for_name_id(name_id)
                    .ok_or_else(|| Error::NameIsNotAnActiveStore(log.clone()))?,
            };

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
#[error("Database error in processor ({0}) {1:?}")]
pub(crate) struct ProcessorError(String, RepositoryError);

trait RequisitionTransferProcessor {
    fn get_description(&self) -> String;

    fn try_process_record_common(
        &self,
        connection: &StorageConnection,
        record: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, ProcessorError> {
        let result = connection
            .transaction_sync(|connection| self.try_process_record(connection, record))
            .map_err(|e| ProcessorError(self.get_description(), e.to_inner_error()))?;

        if let Some(result) = &result {
            log::info!("{} - {}", self.get_description(), result);
        }

        Ok(result)
    }

    /// Caller MUST guarantee that record.requisition.name_id is a store active on this site
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError>;
}
