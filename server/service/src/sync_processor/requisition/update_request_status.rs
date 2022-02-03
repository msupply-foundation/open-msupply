use chrono::Utc;
use repository::{
    schema::{RequisitionRowStatus, RequisitionRowType},
    RequisitionRowRepository,
};

use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};

pub struct UpdateRequisitionStatusProcessor {}

impl ProcessRecord for UpdateRequisitionStatusProcessor {
    fn name(&self) -> String {
        "Update request requisition status to finalised".to_string()
    }

    fn can_execute(&self, record_for_processing: &RecordForProcessing) -> bool {
        if let Record::RequisitionRow(source_requisition) = &record_for_processing.record {
            if !record_for_processing.is_other_party_active_on_site {
                return false;
            }

            if source_requisition.r#type != RequisitionRowType::Response {
                return false;
            }

            if let Some(Record::RequisitionRow(linked_requisition)) =
                &record_for_processing.linked_record
            {
                if linked_requisition.status == RequisitionRowStatus::Finalised {
                    return false;
                }

                if source_requisition.status != RequisitionRowStatus::Finalised {
                    return false;
                }

                return true;
            }
        }

        false
    }

    fn process_record(
        &self,
        connection: &repository::StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError> {
        if let Some(Record::RequisitionRow(linked_requisition)) =
            &record_for_processing.linked_record
        {
            let mut updated_linked_requisition = linked_requisition.clone();

            updated_linked_requisition.status = RequisitionRowStatus::Finalised;

            updated_linked_requisition.finalised_datetime = Some(Utc::now().naive_utc());
            RequisitionRowRepository::new(connection).upsert_one(&updated_linked_requisition)?;

            let result = ProcessRecordResult::Success(format!(
                "updated requisition status to finalised {:#?}",
                linked_requisition
            ));
            return Ok(result);
        }
        Ok(ProcessRecordResult::ConditionNotMetInProcessor)
    }
}
