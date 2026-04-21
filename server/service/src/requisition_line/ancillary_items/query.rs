use repository::{
    ancillary_item::{AncillaryItemFilter, AncillaryItemRepository},
    EqualFilter, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    StorageConnection,
};

use super::compute::{compute_ancillary_plan, AncillaryPlan};

#[derive(Debug, PartialEq)]
pub enum GetAncillaryPlanError {
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
    let lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(requisition_id.to_string())),
    )?;
    let line_rows: Vec<_> = lines.into_iter().map(|l| l.requisition_line_row).collect();

    // Relevant ancillary rows: any row whose principal matches an item on the
    // requisition, plus any row further down a chain the compute logic might
    // walk into. Simplest correct approach is to pull every row and let the
    // compute step filter — there aren't many and the repository already
    // excludes deleted rows.
    let ancillary_rows = AncillaryItemRepository::new(connection)
        .query_by_filter(AncillaryItemFilter::new())?;

    Ok(compute_ancillary_plan(&line_rows, &ancillary_rows))
}
