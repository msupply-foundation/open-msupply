use super::UpdateRequestRequisition;
use crate::requisition::{
    common::get_lines_for_requisition,
    request_requisition::{generate_suggested_quantity, GenerateSuggestedQuantity},
};
use chrono::Utc;
use repository::{
    schema::{RequisitionLineRow, RequisitionRow, RequisitionRowStatus},
    RepositoryError, RequisitionLine, StorageConnection,
};
use util::inline_edit;

pub fn generate(
    connection: &StorageConnection,
    existing: RequisitionRow,
    UpdateRequestRequisition {
        id: _,
        colour: update_colour,
        status: update_status,
        comment: update_comment,
        other_party_id: update_other_party_id,
        their_reference: update_their_reference,
        max_months_of_stock: update_max_months_of_stock,
        min_months_of_stock: update_threashold_months_of_stock,
        expected_delivery_date: update_expected_delivery_date,
    }: UpdateRequestRequisition,
) -> Result<(RequisitionRow, Vec<RequisitionLineRow>), RepositoryError> {
    // Recalculate lines only if max_months_of_stock or min_months_of_stock changed
    let update_threashold_months_of_stock =
        update_threashold_months_of_stock.unwrap_or(existing.min_months_of_stock);
    let update_max_months_of_stock =
        update_max_months_of_stock.unwrap_or(existing.max_months_of_stock);

    let should_recalculate = update_threashold_months_of_stock != existing.min_months_of_stock
        || update_max_months_of_stock != existing.max_months_of_stock;

    let updated_requisition_row = inline_edit(&existing, |mut u| {
        // Only sent status is available in UpdateRequestRequstionStatus
        u.status = if update_status.is_some() {
            RequisitionRowStatus::Sent
        } else {
            u.status
        };
        u.sent_datetime = if update_status.is_some() {
            Some(Utc::now().naive_utc())
        } else {
            u.sent_datetime
        };
        u.colour = update_colour.or(u.colour);
        u.comment = update_comment.or(u.comment);
        u.their_reference = update_their_reference.or(u.their_reference);
        u.min_months_of_stock = update_threashold_months_of_stock;
        u.max_months_of_stock = update_max_months_of_stock;
        u.name_id = update_other_party_id.unwrap_or(u.name_id);
        u.expected_delivery_date = update_expected_delivery_date.or(u.expected_delivery_date);

        u
    });

    let updated_requisition_lines = if should_recalculate {
        generate_updated_lines(
            connection,
            &updated_requisition_row.id,
            updated_requisition_row.min_months_of_stock,
            updated_requisition_row.max_months_of_stock,
        )?
    } else {
        vec![]
    };

    Ok((updated_requisition_row, updated_requisition_lines))
}

pub fn generate_updated_lines(
    connection: &StorageConnection,
    requisition_id: &str,
    min_months_of_stock: f64,
    max_months_of_stock: f64,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let lines = get_lines_for_requisition(connection, requisition_id)?;

    let result = lines
        .into_iter()
        .map(
            |RequisitionLine {
                 mut requisition_line_row,
                 ..
             }| {
                requisition_line_row.suggested_quantity =
                    generate_suggested_quantity(GenerateSuggestedQuantity {
                        average_monthly_consumption: requisition_line_row
                            .average_monthly_consumption,
                        available_stock_on_hand: requisition_line_row.available_stock_on_hand,
                        min_months_of_stock,
                        max_months_of_stock,
                    });
                requisition_line_row
            },
        )
        .collect();

    Ok(result)
}
