use repository::{
    RepositoryError, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    RequisitionStatus, RequisitionType, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    requisition::{common::check_requisition_row_exists, request_requisition::generate_requisition_lines},
    service_provider::ServiceContext,
    PluginOrRepositoryError,
};

use super::{compute::AncillaryDelta, query::get_ancillary_plan};

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum RefreshAncillaryAction {
    /// Insert missing ancillary lines with their computed quantities.
    Add,
    /// Overwrite existing ancillary lines whose quantities are stale.
    Update,
}

#[derive(Debug, PartialEq, Clone)]
pub struct RefreshAncillaryItems {
    pub requisition_id: String,
    pub action: RefreshAncillaryAction,
}

#[derive(Debug, PartialEq)]
pub enum RefreshAncillaryItemsError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    NotARequestRequisition,
    CannotEditRequisition,
    DatabaseError(RepositoryError),
    /// An ancillary item referenced by the plan does not have statistics on
    /// this store (e.g. it has been made invisible). Only surfaced for `Add`.
    CannotGenerateAncillaryLine(String),
}

impl From<RepositoryError> for RefreshAncillaryItemsError {
    fn from(error: RepositoryError) -> Self {
        Self::DatabaseError(error)
    }
}

impl From<PluginOrRepositoryError> for RefreshAncillaryItemsError {
    fn from(error: PluginOrRepositoryError) -> Self {
        match error {
            PluginOrRepositoryError::RepositoryError(e) => Self::DatabaseError(e),
            PluginOrRepositoryError::PluginError(_) => {
                // Forecasting / price plugins shouldn't apply to ancillary fill-in;
                // surface as a generic database error so callers don't need a
                // plugin-specific branch. Realistically this path is rare.
                Self::DatabaseError(RepositoryError::as_db_error("plugin_error", ""))
            }
        }
    }
}

/// Apply the current [`AncillaryPlan`] to a requisition — either inserting the
/// missing lines (`Add`) or refreshing the stale ones (`Update`). Program-
/// requisition ad-hoc-line restriction is intentionally not enforced here:
/// the whole point of ancillary items is to extend the ordered set for
/// vaccine-program requisitions with their non-vaccine supplies.
pub fn refresh_ancillary_items(
    ctx: &ServiceContext,
    input: RefreshAncillaryItems,
) -> Result<Vec<RequisitionLineRow>, RefreshAncillaryItemsError> {
    ctx.connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input.requisition_id)?;

            let plan = get_ancillary_plan(connection, &input.requisition_id)
                .map_err(|e| match e {
                    super::query::GetAncillaryPlanError::DatabaseError(db) => {
                        RefreshAncillaryItemsError::DatabaseError(db)
                    }
                })?;

            let repo = RequisitionLineRowRepository::new(connection);
            let mut changed = Vec::new();

            match input.action {
                RefreshAncillaryAction::Add => {
                    if plan.to_add.is_empty() {
                        return Ok(changed);
                    }
                    let new_lines =
                        generate_ancillary_lines(ctx, &ctx.store_id, &requisition_row, &plan.to_add)?;
                    for row in new_lines {
                        repo.upsert_one(&row)?;
                        changed.push(row);
                    }
                }
                RefreshAncillaryAction::Update => {
                    for delta in plan.to_update {
                        // Unwrap is safe because `to_update` is only populated when
                        // an existing line is found; the id is captured there.
                        let Some(line_id) = delta.existing_line_id else {
                            continue;
                        };
                        let Some(mut row) = repo.find_one_by_id(&line_id)? else {
                            continue;
                        };
                        row.requested_quantity = delta.required_quantity;
                        repo.upsert_one(&row)?;
                        changed.push(row);
                    }
                }
            }

            Ok(changed)
        })
        .map_err(|e| e.to_inner_error())
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    requisition_id: &str,
) -> Result<RequisitionRow, RefreshAncillaryItemsError> {
    let requisition_row = check_requisition_row_exists(connection, requisition_id)?
        .ok_or(RefreshAncillaryItemsError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(RefreshAncillaryItemsError::NotThisStoreRequisition);
    }
    if requisition_row.r#type != RequisitionType::Request {
        return Err(RefreshAncillaryItemsError::NotARequestRequisition);
    }
    if requisition_row.status != RequisitionStatus::Draft {
        return Err(RefreshAncillaryItemsError::CannotEditRequisition);
    }

    Ok(requisition_row)
}

fn generate_ancillary_lines(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: &RequisitionRow,
    to_add: &[AncillaryDelta],
) -> Result<Vec<RequisitionLineRow>, RefreshAncillaryItemsError> {
    let item_ids: Vec<String> = to_add.iter().map(|d| d.item_link_id.clone()).collect();

    // `generate_requisition_lines` fills in stats, pricing, forecasting for
    // each item. Some items might not resolve (e.g. item made invisible for
    // the store) — those are silently dropped by the generator, so we check
    // the output length matches and report any missing ones explicitly.
    let mut generated =
        generate_requisition_lines(ctx, store_id, requisition_row, item_ids, None)?;

    // Overlay the computed ancillary quantity onto each generated line,
    // matching by item_link_id. If a generator missed an item, surface it as a
    // user-facing error so the GUI can explain why a refresh didn't land.
    let mut out = Vec::with_capacity(to_add.len());
    for delta in to_add {
        let pos = generated
            .iter()
            .position(|l| l.item_link_id == delta.item_link_id)
            .ok_or_else(|| {
                RefreshAncillaryItemsError::CannotGenerateAncillaryLine(delta.item_link_id.clone())
            })?;
        let mut row = generated.swap_remove(pos);
        row.id = uuid();
        row.requested_quantity = delta.required_quantity;
        out.push(row);
    }
    Ok(out)
}
