use super::{UpdateRequestRequisition, UpdateRequestRequisitionStatus};
use crate::requisition::{
    common::get_lines_for_requisition,
    request_requisition::{
        generate_suggested_quantity, GenerateSuggestedQuantity, SuggestedQuantityInput,
    },
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus},
    EqualFilter, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRow, StorageConnection,
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
            RequisitionStatus::Sent
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
        generate_updated_lines(connection, &updated_requisition_row)?
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
    requisition: &RequisitionRow,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let lines = get_lines_for_requisition(connection, &requisition.id)?;

    let items = lines
        .iter()
        .map(|l| {
            (
                l.item_row.id.clone(),
                GenerateSuggestedQuantity {
                    average_monthly_consumption: l.requisition_line_row.average_monthly_consumption,
                    available_stock_on_hand: l.requisition_line_row.available_stock_on_hand,
                },
            )
        })
        .collect();

    let suggested_quantities = generate_suggested_quantity(SuggestedQuantityInput {
        requisition: requisition.clone(),
        items,
    });

    let result = lines
        .into_iter()
        .map(|line| RequisitionLineRow {
            suggested_quantity: suggested_quantities
                .get(&line.item_row.id)
                .map(|q| q.suggested_quantity)
                .unwrap_or(0.0),
            ..line.requisition_line_row
        })
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
            .requested_quantity(EqualFilter::equal_to_f64(0.0)),
    )?;

    if lines.is_empty() {
        return Ok(None);
    }

    let requisition_lines = lines.into_iter().map(|l| l.requisition_line_row).collect();
    Ok(Some(requisition_lines))
}
