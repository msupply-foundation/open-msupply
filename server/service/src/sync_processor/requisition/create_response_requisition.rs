use super::common::{can_create_response_requisition, generate_and_integrate_linked_requisition};
use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing, SyncProcessor};
use repository::StorageConnection;

const DESCRIPTION: &'static str =
    "Create response requisition from request requisition (not linking source requisition)";

pub struct CreateResponseRequisitionProcessor<'a> {
    pub connection: &'a StorageConnection,
}

impl<'a> SyncProcessor for CreateResponseRequisitionProcessor<'a> {
    fn try_process_record(
        &self,
        record_for_processing: &RecordForProcessing,
    ) -> Result<Option<String>, ProcessRecordError> {
        let source_requisition = match &record_for_processing.record {
            Record::RequisitionRow(source_requisition) => source_requisition,
            _ => return Ok(None),
        };

        if !can_create_response_requisition(&source_requisition, record_for_processing) {
            return Ok(None);
        }

        if record_for_processing.is_active_record_on_site {
            return Ok(None);
        }

        // Execute
        let (new_requisition, new_requsition_lines) = generate_and_integrate_linked_requisition(
            self.connection,
            &source_requisition,
            record_for_processing,
        )?;

        let result = format!(
            "{}\nnew_requisition: {:#?}\new_requsition_lines: {:#?}",
            DESCRIPTION, new_requisition, new_requsition_lines
        );

        Ok(Some(result))
    }
}
