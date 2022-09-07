use crate::{number::next_number, requisition::common::get_lines_for_requisition};

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};
use chrono::Utc;
use repository::{
    NumberRowType, RepositoryError, Requisition, RequisitionLineRow, RequisitionLineRowRepository,
    RequisitionRow, RequisitionRowRepository, RequisitionRowStatus, RequisitionRowType,
    StorageConnection,
};
use util::uuid::uuid;

pub struct CreateResponseRequisitionProcessor;
impl RequisitionTransferProcessor for CreateResponseRequisitionProcessor {
    fn get_description(&self) -> String {
        "Create response requisition from request requisition".to_string()
    }

    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let RequisitionTransferProcessorRecord {
            linked_requisition,
            requisition: source_requisition,
            ..
        } = &record_for_processing;

        if source_requisition.requisition_row.r#type != RequisitionRowType::Request {
            return Ok(None);
        }

        if source_requisition.requisition_row.status != RequisitionRowStatus::Sent {
            return Ok(None);
        }

        if linked_requisition.is_some() {
            return Ok(None);
        }

        // Execute
        let new_requisition =
            generate_linked_requisition(connection, &source_requisition, record_for_processing)?;

        let new_requisition_lines = generate_linked_requisition_lines(
            connection,
            &new_requisition,
            &source_requisition.requisition_row,
        )?;

        RequisitionRowRepository::new(connection).upsert_one(&new_requisition)?;

        let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

        for line in new_requisition_lines.iter() {
            requisition_line_row_repository.upsert_one(line)?;
        }

        let result = format!(
            "requisition ({}) lines ({:?}) source requisition ({})",
            new_requisition.id,
            new_requisition_lines.into_iter().map(|r| r.id),
            source_requisition.requisition_row.id
        );

        Ok(Some(result))
    }
}

fn generate_linked_requisition(
    connection: &StorageConnection,
    source_requisition: &Requisition,
    record_for_processing: &RequisitionTransferProcessorRecord,
) -> Result<RequisitionRow, RepositoryError> {
    let store_id = record_for_processing.other_party_store_id.clone();
    let name_id = source_requisition.store_row.name_id.clone();

    let source_requistition_row = &source_requisition.requisition_row;

    let result = RequisitionRow {
        id: uuid(),
        requisition_number: next_number(
            connection,
            &NumberRowType::ResponseRequisition,
            &store_id,
        )?,
        name_id,
        store_id,
        r#type: RequisitionRowType::Response,
        status: RequisitionRowStatus::New,
        created_datetime: Utc::now().naive_utc(),
        their_reference: source_requistition_row.their_reference.clone(),
        max_months_of_stock: source_requistition_row.max_months_of_stock.clone(),
        min_months_of_stock: source_requistition_row.min_months_of_stock.clone(),
        linked_requisition_id: Some(source_requistition_row.id.clone()),
        expected_delivery_date: source_requistition_row.expected_delivery_date,
        // Default
        user_id: None,
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
    };

    Ok(result)
}

fn generate_linked_requisition_lines(
    connection: &StorageConnection,
    linked_requisition: &RequisitionRow,
    source_requisition: &RequisitionRow,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let source_lines = get_lines_for_requisition(connection, &source_requisition.id)?;

    let mut new_lines = Vec::new();

    for source_line in source_lines.into_iter() {
        new_lines.push(RequisitionLineRow {
            id: uuid(),
            requisition_id: linked_requisition.id.clone(),
            item_id: source_line.requisition_line_row.item_id,
            requested_quantity: source_line.requisition_line_row.requested_quantity,
            suggested_quantity: source_line.requisition_line_row.suggested_quantity,
            available_stock_on_hand: source_line.requisition_line_row.available_stock_on_hand,
            average_monthly_consumption: source_line
                .requisition_line_row
                .average_monthly_consumption,
            snapshot_datetime: source_line.requisition_line_row.snapshot_datetime,
            // Default
            supply_quantity: 0,
            comment: None,
        });
    }

    Ok(new_lines)
}
