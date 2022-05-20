use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing, SyncProcessor};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    RequisitionRowRepository, StorageConnection,
};

const DESCRIPTION: &'static str = "Update request requisition status to finalised";

pub struct UpdateRequestRequisitionStatusProcessor<'a> {
    pub connection: &'a StorageConnection,
}

impl<'a> SyncProcessor for UpdateRequestRequisitionStatusProcessor<'a> {
    fn try_process_record(
        &self,
        record_for_processing: &RecordForProcessing,
    ) -> Result<Option<String>, ProcessRecordError> {
        // Check can execute
        let (source_requisition, linked_requisition) = match (
            &record_for_processing.record,
            &record_for_processing.linked_record,
        ) {
            (
                Record::RequisitionRow(source_requisition),
                Some(Record::RequisitionRow(linked_requisition)),
            ) => (source_requisition, linked_requisition),
            (_, _) => return Ok(None),
        };

        if !record_for_processing.is_other_party_active_on_site {
            return Ok(None);
        }

        if source_requisition.r#type != RequisitionRowType::Response {
            return Ok(None);
        }

        if linked_requisition.status == RequisitionRowStatus::Finalised {
            return Ok(None);
        }

        if source_requisition.status != RequisitionRowStatus::Finalised {
            return Ok(None);
        }

        // Execute
        let mut updated_linked_requisition = linked_requisition.clone();

        updated_linked_requisition.status = RequisitionRowStatus::Finalised;

        updated_linked_requisition.finalised_datetime = Some(Utc::now().naive_utc());
        RequisitionRowRepository::new(self.connection).upsert_one(&updated_linked_requisition)?;

        let result = format!(
            "{}\nupdated_linked_requisition: {:#?}",
            DESCRIPTION, updated_linked_requisition
        );

        Ok(Some(result))
    }
}
