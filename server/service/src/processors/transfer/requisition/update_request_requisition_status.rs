use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    ActivityLogType, RepositoryError, RequisitionRow, RequisitionRowRepository, StorageConnection,
};

use crate::activity_log::system_activity_log_entry;

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};

const DESCRIPTION: &str = "Update request requisition status to finalised";

pub struct UpdateRequestRequisitionStatusProcessor;

impl RequisitionTransferProcessor for UpdateRequestRequisitionStatusProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Request requisition status will be updated to finalised when all below conditions are met:
    ///
    /// 1. Source requisition name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source requisition is Response requisition
    /// 3. Linked requisition exists (the request requisition)
    /// 4. Linked request requisition is not Finalised
    /// 5. Source response requisition is Finalised
    ///
    /// Only runs once:
    /// 6. Because linked request requisition status is set to Finalised and `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let RequisitionTransferProcessorRecord {
            linked_requisition,
            requisition: response_requisition,
            ..
        } = &record_for_processing;
        // 2.
        if response_requisition.requisition_row.r#type != RequisitionRowType::Response {
            return Ok(None);
        }
        // 3.
        let request_requisition = match &linked_requisition {
            Some(linked_requisition) => linked_requisition,
            None => return Ok(None),
        };
        // 4.
        if request_requisition.requisition_row.status == RequisitionRowStatus::Finalised {
            return Ok(None);
        }
        // 5.
        if response_requisition.requisition_row.status != RequisitionRowStatus::Finalised {
            return Ok(None);
        }

        // Execute
        let updated_request_requisition = RequisitionRow {
            // 6.
            status: RequisitionRowStatus::Finalised,
            finalised_datetime: response_requisition.requisition_row.finalised_datetime,
            ..request_requisition.requisition_row.clone()
        };

        RequisitionRowRepository::new(connection).upsert_one(&updated_request_requisition)?;

        system_activity_log_entry(
            connection,
            ActivityLogType::RequisitionStatusFinalised,
            &updated_request_requisition.store_id,
            &updated_request_requisition.id,
        )?;

        let result = format!(
            "requisition ({}) source requisition ({})",
            updated_request_requisition.id, response_requisition.requisition_row.id
        );

        Ok(Some(result))
    }
}
