use repository::{
    requisition_row::RequisitionType, EqualFilter, RepositoryError, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionLineRowRepository, RequisitionRow,
    RequisitionRowRepository, StorageConnection,
};

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};

const DESCRIPTION: &str = "Update request requisition lines with approved quantities";

pub struct UpdateRequestRequisitionApprovedQuantitiesProcessor;

impl RequisitionTransferProcessor for UpdateRequestRequisitionApprovedQuantitiesProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Request requisition status will be updated to finalised when all below conditions are met:
    ///
    /// 1. Source requisition name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source requisition is Response requisition
    /// 3. Linked requisition exists (the request requisition)
    /// 4. Linked request requisition is not approved
    /// 5. Source response requisition is approved
    ///
    /// Only runs once:
    /// 6. Because linked request requisition status is set to approved and `4.` will never be true again
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
        if response_requisition.requisition_row.r#type != RequisitionType::Response {
            return Ok(None);
        }
        // 3.
        let request_requisition = match &linked_requisition {
            Some(linked_requisition) => linked_requisition,
            None => return Ok(None),
        };
        // 4.
        if let Some(approval_status) = request_requisition.requisition_row.approval_status.clone() {
            if approval_status.is_approved() {
                return Ok(None);
            }
        };
        // 5.
        let approval_status = match response_requisition.requisition_row.approval_status.clone() {
            Some(approval_status) => approval_status,
            None => return Ok(None),
        };
        if !approval_status.is_approved() {
            return Ok(None);
        }

        let requisition_line_repository = RequisitionLineRepository::new(connection);
        let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

        // Get response requisition lines
        let response_lines = requisition_line_repository.query_by_filter(
            RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(
                &response_requisition.requisition_row.id,
            )),
        )?;

        // Update approved quantities on request requisition lines
        for line in response_lines.iter() {
            requisition_line_row_repository.update_approved_quantity_by_item_id(
                &request_requisition.requisition_row.id,
                &line.requisition_line_row.item_link_id,
                line.requisition_line_row.approved_quantity,
            )?;
        }

        // Execute
        let updated_request_requisition = RequisitionRow {
            // 6.
            approval_status: response_requisition.requisition_row.approval_status.clone(),
            ..request_requisition.requisition_row.clone()
        };

        RequisitionRowRepository::new(connection).upsert_one(&updated_request_requisition)?;

        let result = format!(
            "Internal order ({}) updated to approved, per requisition ({})",
            updated_request_requisition.id, response_requisition.requisition_row.id
        );

        Ok(Some(result))
    }
}
