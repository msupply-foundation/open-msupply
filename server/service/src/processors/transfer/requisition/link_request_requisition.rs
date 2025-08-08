use crate::processors::transfer::requisition::RequisitionTransferOutput;

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};
use repository::{
    RepositoryError, RequisitionRow, RequisitionRowRepository, RequisitionType, StorageConnection,
};

const DESCRIPTION: &str = "Link request requisition to response requisition";

pub struct LinkRequestRequisitionProcessor;

impl RequisitionTransferProcessor for LinkRequestRequisitionProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Request requisition is linked to source requisition when all below conditions are met:
    ///
    /// 1. Source requisition name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source requisition is Response requisition
    /// 3. Linked requisition exists (the request requisition)
    /// 4. There is no link between request requisition and source response requisition
    ///
    /// Only runs once:
    /// 5. Because link is created between linked request requisition and source response requisition and `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &RequisitionTransferProcessorRecord,
    ) -> Result<RequisitionTransferOutput, RepositoryError> {
        // Check can execute
        let RequisitionTransferProcessorRecord {
            linked_requisition,
            requisition: response_requisition,
            ..
        } = &record_for_processing;
        // 2.
        if response_requisition.requisition_row.r#type != RequisitionType::Response {
            return Ok(RequisitionTransferOutput::NotResponse);
        }
        // 3.
        let request_requisition = match &linked_requisition {
            Some(linked_requisition) => linked_requisition,
            None => return Ok(RequisitionTransferOutput::NoLinkedRequisition),
        };
        // 4.
        if request_requisition
            .requisition_row
            .linked_requisition_id
            .is_some()
        {
            return Ok(RequisitionTransferOutput::LinkedRequisitionNotLinked);
        }

        // Execute
        let linked_request_requisition = RequisitionRow {
            // 5.
            linked_requisition_id: Some(response_requisition.requisition_row.id.clone()),
            ..request_requisition.requisition_row.clone()
        };

        RequisitionRowRepository::new(connection).upsert_one(&linked_request_requisition)?;

        let result = format!(
            "requisition ({}) source requisition ({})",
            linked_request_requisition.id, response_requisition.requisition_row.id
        );

        Ok(RequisitionTransferOutput::Processed(result))
    }
}
