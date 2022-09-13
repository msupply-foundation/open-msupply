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

    /// Request requisition status will be updated to finalised when all below conditions are met:
    ///
    /// 1. Source requisition name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source requisition is Resposnse requisition
    /// 3. Linked requisition exists (the request requisition)
    /// 4. Linked requsition is not Finalised
    /// 5. Source requisition is Finalised
    ///
    /// Only runs once:
    /// 6. Because linked requisition status is set to Finalised and `4.` will never be true again
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
        if linked_requisition.requisition_row.status == RequisitionRowStatus::Finalised {
            return Ok(None);
        }
        // 5.
        if source_requisition.requisition_row.status != RequisitionRowStatus::Finalised {
            return Ok(None);
        }

        // Execute
        let mut updated_linked_requisition = linked_requisition.requisition_row.clone();
        // 6.
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
