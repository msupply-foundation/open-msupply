use chrono::Utc;
use repository::{
    schema::{RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    RequisitionRowRepository, StorageConnection,
};

use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing};

#[derive(Debug)]
pub struct UpdateRequisitionStatusProcessorResult {
    updated_linked_requisition: RequisitionRow,
}

// Update request requisition status to finalised
pub fn update_requisition_status_processor(
    connection: &StorageConnection,
    record_for_processing: &RecordForProcessing,
) -> Result<Option<UpdateRequisitionStatusProcessorResult>, ProcessRecordError> {
    // Check can execute
    let linked_requisition = if let (
        Record::RequisitionRow(source_requisition),
        Some(Record::RequisitionRow(linked_requisition)),
    ) = (
        &record_for_processing.record,
        &record_for_processing.linked_record,
    ) {
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

        linked_requisition
    } else {
        return Ok(None);
    };

    // Execute
    let mut updated_linked_requisition = linked_requisition.clone();

    updated_linked_requisition.status = RequisitionRowStatus::Finalised;

    updated_linked_requisition.finalised_datetime = Some(Utc::now().naive_utc());
    RequisitionRowRepository::new(connection).upsert_one(&updated_linked_requisition)?;

    Ok(Some(UpdateRequisitionStatusProcessorResult {
        updated_linked_requisition,
    }))
}
