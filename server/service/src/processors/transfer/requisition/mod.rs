pub(crate) mod create_response_requisition;
pub(crate) mod link_request_requisition;
pub(crate) mod update_request_requisition_status;

#[cfg(test)]
pub(crate) mod test;

use repository::{
    ChangelogAction, ChangelogFilter, ChangelogRepository, ChangelogRow, ChangelogTableName,
    EqualFilter, KeyValueStoreRepository, KeyValueType, RepositoryError, Requisition,
    RequisitionFilter, RequisitionRepository, StorageConnection,
};
use thiserror::Error;

use crate::{
    processors::transfer::requisition::{
        create_response_requisition::CreateResponseRequisitionProcessor,
        link_request_requisition::LinkRequestRequisitionProcessor,
        update_request_requisition_status::UpdateRequestRequstionStatusProcessor,
    },
    service_provider::ServiceProvider,
    sync::{ActiveStoresOnSite, GetActiveStoresOnSiteError},
};

const CHANGELOG_BATCH_SIZE: u32 = 20;

#[derive(Clone, Debug)]
pub(crate) struct RequisitionTransferProcessorRecord {
    requisition: Requisition,
    /// Linked requisition through requisition.id, both relations are checked
    /// (requisition.id = linked_requistion.linked_requisition_id OR requisition.linked_requistion_id = requisition.id)
    linked_requisition: Option<Requisition>,
    other_party_store_id: String,
}

#[derive(Error, Debug)]
pub(crate) enum ProcessRequisitionTransfersError {
    #[error("Problem getting upsert record {0}")]
    GetUpsertRecordError(GetUpsertRecordError),
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
        Box::new(UpdateRequestRequstionStatusProcessor),
    ];

    let ctx = service_provider.context().map_err(Error::DatabaseError)?;

    let active_stores =
        ActiveStoresOnSite::get(&ctx.connection).map_err(Error::GetActiveStoresOnSiteError)?;

    let changelog_repo = ChangelogRepository::new(&ctx.connection);
    let key_value_store_repo = KeyValueStoreRepository::new(&ctx.connection);
    // For transfers, changelog MUST be filtered by records where name_id is active store on this site
    // this is the contract obligation for try_process_record in ProcessorTrait
    let filter = ChangelogFilter::new()
        .table_name(ChangelogTableName::Requisition.equal_to())
        .name_id(EqualFilter::equal_any(active_stores.name_ids()));

    loop {
        let cursor = key_value_store_repo
            .get_i64(KeyValueType::RequisitionTransferProcessorCursor)
            .map_err(Error::DatabaseError)?
            .unwrap_or(0) as u64;

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
                ChangelogAction::Upsert => {
                    get_upsert_record(&ctx.connection, &log).map_err(Error::GetUpsertRecordError)?
                }
                ChangelogAction::Delete => continue,
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

            key_value_store_repo
                .set_i64(
                    KeyValueType::RequisitionTransferProcessorCursor,
                    Some(log.cursor + 1),
                )
                .map_err(Error::DatabaseError)?;
        }
    }

    Ok(())
}

#[derive(Error, Debug)]
pub(crate) enum GetUpsertRecordError {
    #[error("Requisition not found {0:?}")]
    RequisitionNotFound(ChangelogRow),
    #[error("Database error while fetching requisition with id {0} {1:?}")]
    DatabaseError(String, RepositoryError),
}

fn get_upsert_record(
    connection: &StorageConnection,
    changelog_row: &ChangelogRow,
) -> Result<(Requisition, Option<Requisition>), GetUpsertRecordError> {
    use GetUpsertRecordError::*;
    let repo = RequisitionRepository::new(connection);

    let requisition = repo
        .query_one(RequisitionFilter::by_id(&changelog_row.record_id))
        .map_err(|e| DatabaseError(changelog_row.record_id.clone(), e))?
        .ok_or_else(|| RequisitionNotFound(changelog_row.clone()))?;

    let linked_requisition = match &requisition.requisition_row.linked_requisition_id {
        Some(id) => repo
            .query_one(RequisitionFilter::by_id(id))
            .map_err(|e| DatabaseError(id.to_string(), e))?,
        None => repo
            .query_one(RequisitionFilter::by_linked_requisition_id(
                &requisition.requisition_row.id,
            ))
            .map_err(|e| DatabaseError(requisition.requisition_row.id.clone(), e))?,
    };

    Ok((requisition, linked_requisition))
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
            .transaction_sync(|connection| self.try_process_record(connection, &record))
            .map_err(|e| ProcessorError(self.get_description(), e.to_inner_error()))?;

        if let Some(result) = &result {
            log::info!("{} - {}", self.get_description(), result);
        }

        Ok(result)
    }

    /// Caller MUST gurantedd that record.requisition.name_id is a store active on this site
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError>;
}
