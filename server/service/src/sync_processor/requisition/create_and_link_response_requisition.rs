use super::common::{can_create_response_requisition, generate_and_integrate_linked_requisition};
use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing, SyncProcessor};
use repository::{RequisitionRowRepository, StorageConnection};

const DESCRIPTION: &'static str =
    "Create response requisition from request requisition (linking source requisition)";

pub struct CreateAndLinkResponseRequisitionProcessor<'a> {
    pub connection: &'a StorageConnection,
}

impl<'a> SyncProcessor for CreateAndLinkResponseRequisitionProcessor<'a> {
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

        if !record_for_processing.is_active_record_on_site {
            return Ok(None);
        }

        // Execute
        let (new_requisition, new_requsition_lines) = generate_and_integrate_linked_requisition(
            self.connection,
            &source_requisition,
            record_for_processing,
        )?;

        let mut updated_source_requisition = source_requisition.clone();
        updated_source_requisition.linked_requisition_id = Some(new_requisition.id.clone());
        RequisitionRowRepository::new(self.connection).upsert_one(&updated_source_requisition)?;

        let result = format!(
            "{}\nnew_requisition: {:#?}\new_requsition_lines: {:#?}\nupdated_source_requisition: {:#?}",
            DESCRIPTION, new_requisition, new_requsition_lines, updated_source_requisition
        );

        Ok(Some(result))
    }
}
