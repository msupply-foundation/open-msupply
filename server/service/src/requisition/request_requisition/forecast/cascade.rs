use super::{apply_forecast, order_demand, ForecastInputs};
use repository::{
    EqualFilter, ForecastMethod, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow, StorageConnection,
};
use std::collections::HashSet;

/// Rounds of recomputation before giving up. Configured links are acyclic and at most
/// five deep; a diamond (a principal feeding an ancillary both directly and through
/// another ancillary) can need a line recomputed once per path, so allow some slack.
const MAX_ROUNDS: usize = 10;

/// Recomputes the Ancillary-ratio lines fed by `changed_item_ids` — principal lines that
/// arrived on the requisition, changed method, or left it — and the lines those feed in
/// turn, down the chain. A line left with no principal on the order takes the next
/// available default. Returns the lines whose forecast changed, which are saved.
pub fn recompute_ancillary_dependants(
    connection: &StorageConnection,
    store_id: &str,
    requisition: &RequisitionRow,
    changed_item_ids: Vec<String>,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    if changed_item_ids.is_empty() {
        return Ok(vec![]);
    }

    let mut lines: Vec<RequisitionLineRow> = RequisitionLineRepository::new(connection)
        .query_by_filter(
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(requisition.id.to_string())),
        )?
        .into_iter()
        .map(|line| line.requisition_line_row)
        .collect();

    // Only Ancillary-ratio lines are ever recomputed; nothing to do without one
    if !lines
        .iter()
        .any(|line| line.forecast_method == ForecastMethod::AncillaryRatio)
    {
        return Ok(vec![]);
    }

    let item_ids: Vec<String> = lines.iter().map(|line| line.item_id.clone()).collect();
    let inputs = ForecastInputs::load(connection, store_id, &item_ids)?;
    let mut order = order_demand(&lines);
    let mut changed: HashSet<String> = changed_item_ids.into_iter().collect();
    let mut updated: Vec<String> = Vec::new();

    for _ in 0..MAX_ROUNDS {
        let mut next = HashSet::new();

        for line in lines.iter_mut() {
            let fed_by_change = line.forecast_method == ForecastMethod::AncillaryRatio
                && inputs
                    .principal_items(&line.item_id)
                    .any(|principal| changed.contains(principal));
            if !fed_by_change {
                continue;
            }

            let forecast = match inputs.unavailable_reason(
                ForecastMethod::AncillaryRatio,
                &line.item_id,
                &order,
            ) {
                None => inputs.forecast(
                    ForecastMethod::AncillaryRatio,
                    &line.item_id,
                    line.average_monthly_consumption,
                    &order,
                ),
                // The last principal left
                Some(_) => {
                    inputs.default_forecast(&line.item_id, line.average_monthly_consumption, &order)
                }
            };

            let before = line.clone();
            apply_forecast(line, forecast, requisition);
            if *line != before {
                order.insert(line.item_id.clone(), line.forecast_monthly_consumption);
                next.insert(line.item_id.clone());
                if !updated.contains(&line.id) {
                    updated.push(line.id.clone());
                }
            }
        }

        if next.is_empty() {
            break;
        }
        changed = next;
    }

    let repository = RequisitionLineRowRepository::new(connection);
    let updated_lines: Vec<RequisitionLineRow> = lines
        .into_iter()
        .filter(|line| updated.contains(&line.id))
        .collect();
    for line in &updated_lines {
        repository.upsert_one(line)?;
    }

    Ok(updated_lines)
}
