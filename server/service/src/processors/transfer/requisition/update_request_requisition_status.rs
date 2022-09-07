use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    RepositoryError, RequisitionRowRepository, StorageConnection,
};

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};

const DESCRIPTION: &'static str = "Update request requisition status to finalised";

pub struct UpdateRequestRequstionStatusProcessor;

impl RequisitionTransferProcessor for UpdateRequestRequstionStatusProcessor {
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

        if linked_requisition.requisition_row.status == RequisitionRowStatus::Finalised {
            return Ok(None);
        }

        if source_requisition.requisition_row.status != RequisitionRowStatus::Finalised {
            return Ok(None);
        }

        // Execute
        let mut updated_linked_requisition = linked_requisition.requisition_row.clone();

        updated_linked_requisition.status = RequisitionRowStatus::Finalised;

        updated_linked_requisition.finalised_datetime = source_requisition
            .requisition_row
            .finalised_datetime
            .clone();

        RequisitionRowRepository::new(connection).upsert_one(&updated_linked_requisition)?;

        let result = format!(
            "requisition ({}) source requisition ({})",
            updated_linked_requisition.id, source_requisition.requisition_row.id
        );

        Ok(Some(result))
    }
}
