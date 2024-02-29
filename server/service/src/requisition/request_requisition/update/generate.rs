use super::{UpdateRequestRequisition, UpdateRequestRequisitionStatus};
use crate::requisition::{
    common::get_lines_for_requisition,
    request_requisition::{generate_suggested_quantity, GenerateSuggestedQuantity},
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionRowStatus},
    EqualFilter, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionLineRow, StorageConnection,
};
use util::inline_edit;

pub struct GenerateResult {
    pub(crate) updated_requisition_row: RequisitionRow,
    pub(crate) updated_requisition_lines: Vec<RequisitionLineRow>,
    pub(crate) empty_lines_to_trim: Option<Vec<RequisitionLineRow>>,
}

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
        min_months_of_stock: update_threshold_months_of_stock,
        expected_delivery_date: update_expected_delivery_date,
    }: UpdateRequestRequisition,
) -> Result<GenerateResult, RepositoryError> {
    // Recalculate lines only if max_months_of_stock or min_months_of_stock changed
    let update_threshold_months_of_stock =
        update_threshold_months_of_stock.unwrap_or(existing.min_months_of_stock);
    let update_max_months_of_stock =
        update_max_months_of_stock.unwrap_or(existing.max_months_of_stock);

    let should_recalculate = update_threshold_months_of_stock != existing.min_months_of_stock
        || update_max_months_of_stock != existing.max_months_of_stock;

    let updated_requisition_row = inline_edit(&existing, |mut u| {
        // Only sent status is available in UpdateRequestRequisitionStatus
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
        u.min_months_of_stock = update_threshold_months_of_stock;
        u.max_months_of_stock = update_max_months_of_stock;
        u.name_link_id = update_other_party_id.unwrap_or(u.name_link_id);
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

    Ok(GenerateResult {
        updated_requisition_row,
        updated_requisition_lines,
        empty_lines_to_trim: empty_lines_to_trim(connection, &existing, &update_status)?,
    })
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

pub fn empty_lines_to_trim(
    connection: &StorageConnection,
    requisition: &RequisitionRow,
    status: &Option<UpdateRequestRequisitionStatus>,
) -> Result<Option<Vec<RequisitionLineRow>>, RepositoryError> {
    let new_status = match status {
        Some(new_status) => new_status,
        None => return Ok(None),
    };

    if new_status != &UpdateRequestRequisitionStatus::Sent {
        return Ok(None);
    }

    let lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_to(&requisition.id))
            .requested_quantity(EqualFilter::equal_to_i32(0)),
    )?;

    if lines.is_empty() {
        return Ok(None);
    }

    let requisition_lines = lines.into_iter().map(|l| l.requisition_line_row).collect();
    return Ok(Some(requisition_lines));
}
