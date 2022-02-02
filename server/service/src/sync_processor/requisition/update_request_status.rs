use chrono::Utc;
use repository::{
    schema::{RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    RequisitionRowRepository,
};

use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};

pub struct UpdateRequisitionStatusProcessor {}

impl ProcessRecord for UpdateRequisitionStatusProcessor {
    fn process_record(
        &self,
        connection: &repository::StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError> {
        let result = if let Some(mut linked_requisition) = should_execute(record_for_processing) {
            linked_requisition.status = RequisitionRowStatus::Finalised;
            linked_requisition.finalised_datetime = Some(Utc::now().naive_utc());
            RequisitionRowRepository::new(connection).upsert_one(&linked_requisition)?;

            ProcessRecordResult::Success(format!(
                "updated requisition status to finalised {:#?}\nbased on {:#?}",
                linked_requisition, record_for_processing
            ))
        } else {
            ProcessRecordResult::ConditionNotMet
        };

        Ok(result)
    }

    fn name(&self) -> String {
        "Update request requisition status to finalised".to_string()
    }
}

fn should_execute(record_for_processing: &RecordForProcessing) -> Option<RequisitionRow> {
    if let Record::RequisitionRow(source_requisition) = &record_for_processing.record {
        if !record_for_processing.is_other_party_active_on_site {
            return None;
        }

        if source_requisition.r#type != RequisitionRowType::Response {
            return None;
        }

        if let Some(Record::RequisitionRow(linked_requisition)) =
            &record_for_processing.linked_record
        {
            if linked_requisition.status == RequisitionRowStatus::Finalised {
                return None;
            }

            if source_requisition.status != RequisitionRowStatus::Finalised {
                return None;
            }

            return Some(linked_requisition.clone());
        }
    }

    None
}
