use super::common::{can_create_response_requisition, generate_and_integrate_linked_requisition};
use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};
use repository::RequisitionRowRepository;

pub struct CreateAndLinkRequistionProcessor {}

impl ProcessRecord for CreateAndLinkRequistionProcessor {
    fn name(&self) -> String {
        "Create linked requisition (linking source requisition)".to_string()
    }

    fn can_execute(&self, record_for_processing: &RecordForProcessing) -> bool {
        if let Record::RequisitionRow(source_requisition) = &record_for_processing.record {
            if !can_create_response_requisition(&source_requisition, record_for_processing) {
                return false;
            }

            if !record_for_processing.is_active_record_on_site {
                return false;
            }

            return true;
        }

        false
    }

    fn process_record(
        &self,
        connection: &repository::StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError> {
        if let Record::RequisitionRow(source) = &record_for_processing.record {
            let (requisition_row, requisition_line_rows) =
                generate_and_integrate_linked_requisition(
                    connection,
                    &source,
                    record_for_processing,
                )?;

            let mut update_source = source.clone();
            update_source.linked_requisition_id = Some(requisition_row.id.clone());
            RequisitionRowRepository::new(connection).upsert_one(&update_source)?;

            let result = ProcessRecordResult::Success(format!(
                "generated: {:#?}\n{:#?}\nand linking{:#?}\nfrom {:#?}",
                requisition_row, requisition_line_rows, update_source, record_for_processing
            ));
            return Ok(result);
        }
        Ok(ProcessRecordResult::ConditionNotMetInProcessor)
    }
}
