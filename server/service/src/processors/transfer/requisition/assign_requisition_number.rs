use crate::{activity_log::system_activity_log_entry, number::next_number};

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};
use repository::{
    ActivityLogType, NumberRowType, RepositoryError, RequisitionRow, RequisitionRowRepository,
    RequisitionStatus, RequisitionType, StorageConnection,
};

const DESCRIPTION: &str =
    "Allocate a requisition_number to response requisitions if they have a requisition_number of -1";

pub struct AssignRequisitionNumberProcessor;
impl RequisitionTransferProcessor for AssignRequisitionNumberProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Response requisition is created from source requisition when all below conditions are met:
    ///
    /// 1. Source requisition name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source requisition is Request requisition
    /// 3. Source requisition is Status is Sent
    /// 4. Response requisition exists
    /// 5. Response requisition requisition_number is -1
    /// Only runs once:
    /// 6. Because new response requisition is allocated a requisition_number
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let RequisitionTransferProcessorRecord {
            linked_requisition: response_requisition,
            requisition: request_requisition,
            ..
        } = &record_for_processing;

        // 2.
        if request_requisition.requisition_row.r#type != RequisitionType::Request {
            return Ok(None);
        }
        // 3.
        if request_requisition.requisition_row.status != RequisitionStatus::Sent {
            return Ok(None);
        }
        // 4.
        let response_requisition = match response_requisition {
            Some(response_requisition) => response_requisition,
            None => return Ok(None),
        };
        // 5.
        if response_requisition.requisition_row.requisition_number != -1 {
            return Ok(None);
        }

        // Execute
        let updated_requisition_row = RequisitionRow {
            requisition_number: next_number(
                connection,
                &NumberRowType::ResponseRequisition,
                &response_requisition.store_row.id,
            )?,
            ..response_requisition.requisition_row.clone()
        };

        RequisitionRowRepository::new(connection).upsert_one(&updated_requisition_row)?;
        system_activity_log_entry(
            connection,
            ActivityLogType::RequisitionNumberAllocated,
            &response_requisition.store_row.id,
            &response_requisition.requisition_row.id,
        )?;

        let result = format!(
            "requisition ({}) allocated requisition_number {}",
            updated_requisition_row.id, updated_requisition_row.requisition_number
        );

        Ok(Some(result))
    }
}
