use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};
use repository::{
    RepositoryError, RequisitionRowRepository, RequisitionRowType, StorageConnection,
};

const DESCRIPTION: &'static str = "Link request requisition to response requisition";

pub struct LinkeRequestRequisitionProcessor;

impl RequisitionTransferProcessor for LinkeRequestRequisitionProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

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

        if source_requisition.requisition_row.r#type != RequisitionRowType::Response {
            return Ok(None);
        }

        let linked_requisition = match &linked_requisition {
            Some(linked_requisition) => linked_requisition,
            None => return Ok(None),
        };

        if linked_requisition
            .requisition_row
            .linked_requisition_id
            .is_some()
        {
            return Ok(None);
        }

        // Execute
        let mut update_linked_requisition = linked_requisition.requisition_row.clone();
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
