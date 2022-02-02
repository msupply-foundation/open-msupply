use super::common::{can_create_response_requisition, generate_and_integrate_linked_requisition};
use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};
use repository::{schema::RequisitionRow, RequisitionRowRepository};

pub struct CreateAndLinkRequistionProcessor {}

impl ProcessRecord for CreateAndLinkRequistionProcessor {
    fn process_record(
        &self,
        connection: &repository::StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError> {
        let result = if let Some(source) = should_execute(record_for_processing) {
            let (requisition_row, requisition_line_rows) =
                generate_and_integrate_linked_requisition(connection, source)?;

            let mut update_source = source.clone();
            update_source.linked_requisition_id = Some(requisition_row.id.clone());
            RequisitionRowRepository::new(connection).upsert_one(&update_source)?;

            ProcessRecordResult::Success(format!(
                "generated: {:#?}\n{:#?}\nand linking{:#?}\nfrom {:#?}",
                requisition_row, requisition_line_rows, update_source, record_for_processing
            ))
        } else {
            ProcessRecordResult::ConditionNotMet
        };

        Ok(result)
    }

    fn name(&self) -> String {
        "Create linked requisition (linking source requisition)".to_string()
    }
}

fn should_execute(record_for_processing: &RecordForProcessing) -> Option<&RequisitionRow> {
    if let Record::RequisitionRow(source_requisition) = &record_for_processing.record {
        if !can_create_response_requisition(&source_requisition, record_for_processing) {
            return None;
        }

        if !record_for_processing.is_active_record_on_site {
            return None;
        }

        return Some(source_requisition);
    }

    None
}
