use super::{UpdateRequestRequisition, UpdateRequestRequisitionStatus};
use crate::{nullable_update, store_preference::get_store_preferences};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus},
    EqualFilter, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRow, StorageConnection,
};

pub struct GenerateResult {
    pub(crate) updated_requisition_row: RequisitionRow,
    pub(crate) empty_lines_to_trim: Option<Vec<RequisitionLineRow>>,
    /// `true` when min/max months of stock changed, signalling the caller
    /// should refresh forecasts via
    /// `recompute_forecasts_and_suggested_quantities` after upserting the row.
    pub(crate) should_recalculate: bool,
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
        destination_customer_id,
    }: UpdateRequestRequisition,
) -> Result<GenerateResult, RepositoryError> {
    let keep_requisition_lines_with_zero_requested_quantity_on_finalised =
        get_store_preferences(connection, &existing.store_id.clone())?
            .keep_requisition_lines_with_zero_requested_quantity_on_finalised;

    let update_threshold_months_of_stock =
        update_threshold_months_of_stock.unwrap_or(existing.min_months_of_stock);
    let update_max_months_of_stock =
        update_max_months_of_stock.unwrap_or(existing.max_months_of_stock);

    let should_recalculate = update_threshold_months_of_stock != existing.min_months_of_stock
        || update_max_months_of_stock != existing.max_months_of_stock;

    let updated_requisition_row = RequisitionRow {
        // Only sent status is available in UpdateRequestRequisitionStatus
        status: if update_status.is_some() {
            RequisitionStatus::Sent
        } else {
            existing.status.clone()
        },
        sent_datetime: if update_status.is_some() {
            Some(Utc::now().naive_utc())
        } else {
            existing.sent_datetime
        },
        colour: update_colour.or(existing.colour.clone()),
        comment: update_comment.or(existing.comment.clone()),
        their_reference: update_their_reference.or(existing.their_reference.clone()),
        min_months_of_stock: update_threshold_months_of_stock,
        max_months_of_stock: update_max_months_of_stock,
        name_id: update_other_party_id.unwrap_or(existing.name_id.clone()),
        expected_delivery_date: update_expected_delivery_date.or(existing.expected_delivery_date),
        destination_customer_id: nullable_update(
            &destination_customer_id,
            existing.destination_customer_id.clone(),
        ),
        ..existing.clone()
    };

    let empty_lines_to_trim = if keep_requisition_lines_with_zero_requested_quantity_on_finalised {
        None
    } else {
        empty_lines_to_trim(connection, &existing.clone(), &update_status)?
    };

    Ok(GenerateResult {
        updated_requisition_row,
        empty_lines_to_trim,
        should_recalculate,
    })
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
            .requisition_id(EqualFilter::equal_to(requisition.id.to_string()))
            .requested_quantity(EqualFilter::equal_to(0.0)),
    )?;

    if lines.is_empty() {
        return Ok(None);
    }

    let requisition_lines = lines.into_iter().map(|l| l.requisition_line_row).collect();
    Ok(Some(requisition_lines))
}
