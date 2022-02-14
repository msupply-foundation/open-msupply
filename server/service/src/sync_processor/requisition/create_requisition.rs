use repository::{
    schema::{RequisitionLineRow, RequisitionRow},
    StorageConnection,
};

use super::common::{can_create_response_requisition, generate_and_integrate_linked_requisition};
use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing};

#[derive(Debug)]
pub struct CreateRequisitionProcessorResult {
    new_requisition: RequisitionRow,
    new_requsition_lines: Vec<RequisitionLineRow>,
}

// Create linked requisition (not linking source requisition)
pub fn create_requisition_processor(
    connection: &StorageConnection,
    record_for_processing: &RecordForProcessing,
) -> Result<Option<CreateRequisitionProcessorResult>, ProcessRecordError> {
    // Check can execute
    let source_requisition =
        if let (Record::RequisitionRow(source_requisition),) = (&record_for_processing.record,) {
            if !can_create_response_requisition(&source_requisition, record_for_processing) {
                return Ok(None);
            }

            if record_for_processing.is_active_record_on_site {
                return Ok(None);
            }

            source_requisition
        } else {
            return Ok(None);
        };

    // Execute
    let (new_requisition, new_requsition_lines) = generate_and_integrate_linked_requisition(
        connection,
        &source_requisition,
        record_for_processing,
    )?;

    Ok(Some(CreateRequisitionProcessorResult {
        new_requisition,
        new_requsition_lines,
    }))
}
