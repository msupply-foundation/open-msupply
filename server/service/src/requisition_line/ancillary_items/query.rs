use repository::{
    EqualFilter, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionRowRepository, StorageConnection,
    ancillary_item::{AncillaryItemFilter, AncillaryItemRepository},
};
use std::collections::HashSet;

use super::compute::{AncillaryPlan, compute_ancillary_plan};
use crate::requisition::request_requisition::wastage_rates;

#[derive(Debug, PartialEq)]
pub enum GetAncillaryPlanError {
    RequisitionDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for GetAncillaryPlanError {
    fn from(error: RepositoryError) -> Self {
        Self::DatabaseError(error)
    }
}

/// Build the [`AncillaryPlan`] for a single requisition. The heavy lifting is
/// pure logic in [`compute_ancillary_plan`]; this function's job is just to
/// fetch the inputs.
pub fn get_ancillary_plan(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<AncillaryPlan, GetAncillaryPlanError> {
    let requisition = RequisitionRowRepository::new(connection)
        .find_one_by_id(requisition_id)?
        .ok_or(GetAncillaryPlanError::RequisitionDoesNotExist)?;
    let line_rows: Vec<_> = RequisitionLineRepository::new(connection)
        .query_by_filter(
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(requisition_id.to_string())),
        )?
        .into_iter()
        .map(|l| l.requisition_line_row)
        .collect();

    // Relevant ancillary rows: any row whose principal matches an item on the
    // requisition, plus any row further down a chain the compute logic might
    // walk into. Simplest correct approach is to pull every row and let the
    // compute step filter — there aren't many and the repository already
    // excludes deleted rows.
    let ancillary_rows =
        AncillaryItemRepository::new(connection).query_by_filter(AncillaryItemFilter::new())?;

    // The wastage rates, in the order's store, of the principals whose links exclude them
    let principal_ids: Vec<String> = ancillary_rows
        .iter()
        .filter(|row| row.exclude_principal_wastage)
        .map(|row| row.item_id.clone())
        .collect::<HashSet<String>>()
        .into_iter()
        .collect();
    let wastage_rates = wastage_rates(connection, &requisition.store_id, &principal_ids)?;

    Ok(compute_ancillary_plan(
        &line_rows,
        &ancillary_rows,
        &wastage_rates,
    ))
}
