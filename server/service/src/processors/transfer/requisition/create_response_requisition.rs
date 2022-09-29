use crate::{number::next_number, requisition::common::get_lines_for_requisition};

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};
use chrono::Utc;
use repository::{
    NumberRowType, RepositoryError, Requisition, RequisitionLineRow, RequisitionLineRowRepository,
    RequisitionRow, RequisitionRowRepository, RequisitionRowStatus, RequisitionRowType,
    StorageConnection,
};
use util::uuid::uuid;

const DESCRIPTION: &'static str = "Create response requisition from request requisition";

pub struct CreateResponseRequisitionProcessor;
impl RequisitionTransferProcessor for CreateResponseRequisitionProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Response requisition is created from source requisition when all below conditions are met:
    ///
    /// 1. Source requisition name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source requisition is Request requisition
    /// 3. Source requisition is Status is Sent
    /// 4. Response requisition does not exists (no link is found for source requisition)
    ///
    /// Only runs once:
    /// 5. Because new response requisition is linked to source requisition when it's created and `4.` will never be true again
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
        if request_requisition.requisition_row.r#type != RequisitionRowType::Request {
            return Ok(None);
        }
        // 3.
        if request_requisition.requisition_row.status != RequisitionRowStatus::Sent {
            return Ok(None);
        }
        // 4.
        if response_requisition.is_some() {
            return Ok(None);
        }

        // Execute
        let new_response_requisition =
            generate_response_requisition(connection, &request_requisition, record_for_processing)?;

        let new_requisition_lines = generate_response_requisition_lines(
            connection,
            &new_response_requisition.id,
            &request_requisition.requisition_row,
        )?;

        RequisitionRowRepository::new(connection).upsert_one(&new_response_requisition)?;

        let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

        for line in new_requisition_lines.iter() {
            requisition_line_row_repository.upsert_one(line)?;
        }

        let result = format!(
            "requisition ({}) lines ({:?}) source requisition ({})",
            new_response_requisition.id,
            new_requisition_lines.into_iter().map(|r| r.id),
            request_requisition.requisition_row.id
        );

        Ok(Some(result))
    }
}

fn generate_response_requisition(
    connection: &StorageConnection,
    request_requisition: &Requisition,
    record_for_processing: &RequisitionTransferProcessorRecord,
) -> Result<RequisitionRow, RepositoryError> {
    let store_id = record_for_processing.other_party_store_id.clone();
    let name_id = request_requisition.store_row.name_id.clone();

    let request_requisition_row = &request_requisition.requisition_row;

    let requisition_number =
        next_number(connection, &NumberRowType::ResponseRequisition, &store_id)?;

    let result = RequisitionRow {
        id: uuid(),
        requisition_number,
        name_id,
        store_id,
        r#type: RequisitionRowType::Response,
        status: RequisitionRowStatus::New,
        created_datetime: Utc::now().naive_utc(),
        their_reference: request_requisition_row.their_reference.clone(),
        max_months_of_stock: request_requisition_row.max_months_of_stock.clone(),
        min_months_of_stock: request_requisition_row.min_months_of_stock.clone(),
        // 5.
        linked_requisition_id: Some(request_requisition_row.id.clone()),
        expected_delivery_date: request_requisition_row.expected_delivery_date,
        // Default
        user_id: None,
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
    };

    Ok(result)
}

fn generate_response_requisition_lines(
    connection: &StorageConnection,
    response_requisition_id: &str,
    request_requisition: &RequisitionRow,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let request_lines = get_lines_for_requisition(connection, &request_requisition.id)?;

    let response_lines = request_lines
        .into_iter()
        .map(|l| l.requisition_line_row)
        .map(
            |RequisitionLineRow {
                 id: _,
                 requisition_id: _,
                 item_id,
                 requested_quantity,
                 suggested_quantity,
                 supply_quantity: _,
                 available_stock_on_hand,
                 average_monthly_consumption,
                 snapshot_datetime,
                 comment,
             }| RequisitionLineRow {
                id: uuid(),
                requisition_id: response_requisition_id.to_string(),
                item_id,
                requested_quantity,
                suggested_quantity,
                available_stock_on_hand,
                average_monthly_consumption,
                snapshot_datetime,
                comment,
                // Default
                supply_quantity: 0,
            },
        )
        .collect();

    Ok(response_lines)
}
