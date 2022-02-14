use super::common::{can_create_response_requisition, generate_and_integrate_linked_requisition};
use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing};
use repository::{
    schema::{RequisitionLineRow, RequisitionRow},
    RequisitionRowRepository, StorageConnection,
};

#[derive(Debug)]
pub struct CreateAndLinkeRequisitionProcessorResult {
    new_requisition: RequisitionRow,
    new_requsition_lines: Vec<RequisitionLineRow>,
    updated_source_requisition: RequisitionRow,
}

// Create linked requisition (linking source requisition)
pub fn create_and_link_requisition_processor(
    connection: &StorageConnection,
    record_for_processing: &RecordForProcessing,
) -> Result<Option<CreateAndLinkeRequisitionProcessorResult>, ProcessRecordError> {
    // Check can execute
    let source_requisition = match &record_for_processing.record {
        Record::RequisitionRow(source_requisition) => source_requisition,
        _ => return Ok(None),
    };

    if !can_create_response_requisition(&source_requisition, record_for_processing) {
        return Ok(None);
    }

    if !record_for_processing.is_active_record_on_site {
        return Ok(None);
    }

    // Execute
    let (new_requisition, new_requsition_lines) = generate_and_integrate_linked_requisition(
        connection,
        &source_requisition,
        record_for_processing,
    )?;

    let mut updated_source_requisition = source_requisition.clone();
    updated_source_requisition.linked_requisition_id = Some(new_requisition.id.clone());
    RequisitionRowRepository::new(connection).upsert_one(&updated_source_requisition)?;

    Ok(Some(CreateAndLinkeRequisitionProcessorResult {
        new_requisition,
        new_requsition_lines,
        updated_source_requisition,
    }))
}
