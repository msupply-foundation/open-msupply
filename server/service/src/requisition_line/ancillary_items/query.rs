use repository::{
    EqualFilter, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    StorageConnection,
    ancillary_item::{AncillaryItemFilter, AncillaryItemRepository},
};
use std::collections::{HashMap, HashSet};

use super::compute::{AncillaryPlan, compute_ancillary_plan};
use crate::requisition::request_requisition::wastage_rates;

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
        RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_to(requisition_id.to_string())),
    )?;
    let store_id = lines
        .first()
        .map(|line| line.requisition_row.store_id.clone());
    let line_rows: Vec<_> = lines.into_iter().map(|l| l.requisition_line_row).collect();

    // Relevant ancillary rows: any row whose principal matches an item on the
    // requisition, plus any row further down a chain the compute logic might
    // walk into. Simplest correct approach is to pull every row and let the
    // compute step filter — there aren't many and the repository already
    // excludes deleted rows.
    let ancillary_rows =
        AncillaryItemRepository::new(connection).query_by_filter(AncillaryItemFilter::new())?;

    // The wastage rates, in the order's store, of the principals whose links exclude them
    let wastage_rates = match store_id {
        Some(store_id) => {
            let principal_ids: Vec<String> = ancillary_rows
                .iter()
                .filter(|row| row.exclude_principal_wastage)
                .map(|row| row.item_id.clone())
                .collect::<HashSet<String>>()
                .into_iter()
                .collect();
            wastage_rates(connection, &store_id, &principal_ids)?
        }
        None => HashMap::new(),
    };

    Ok(compute_ancillary_plan(
        &line_rows,
        &ancillary_rows,
        &wastage_rates,
    ))
}
