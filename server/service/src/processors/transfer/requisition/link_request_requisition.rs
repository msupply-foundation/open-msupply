use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};
use repository::{
    RepositoryError, RequisitionRowRepository, RequisitionRowType, StorageConnection,
};

const DESCRIPTION: &'static str = "Link request requisition to response requisition";

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
    /// 4. There is no link between linked requisition and source requisition
    ///
    /// Only runs once:
    /// 5. Because link is created between linked request requisition and source requisition and `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let RequisitionTransferProcessorRecord {
            linked_requisition,
            requisition: source_requisition,
            ..
        } = &record_for_processing;
        // 2.
        if source_requisition.requisition_row.r#type != RequisitionRowType::Response {
            return Ok(None);
        }
        // 3.
        let linked_requisition = match &linked_requisition {
            Some(linked_requisition) => linked_requisition,
            None => return Ok(None),
        };
        // 4.
        if linked_requisition
            .requisition_row
            .linked_requisition_id
            .is_some()
        {
            return Ok(None);
        }

        // Execute
        let mut update_linked_requisition = linked_requisition.requisition_row.clone();
        // 5.
        update_linked_requisition.linked_requisition_id =
            Some(source_requisition.requisition_row.id.clone());
        RequisitionRowRepository::new(connection).upsert_one(&update_linked_requisition)?;

        let result = format!(
            "requisition ({}) source requisition ({})",
            update_linked_requisition.id, source_requisition.requisition_row.id
        );

        Ok(Some(result))
    }
}
