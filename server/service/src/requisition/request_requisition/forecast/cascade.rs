use super::{ForecastInputs, OrderDemand, apply_forecast, order_demand};
use crate::requisition_line::ancillary_items::compute::MAX_ANCILLARY_DEPTH;
use repository::{
    EqualFilter, ForecastMethod, RepositoryError, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow, StorageConnection,
};
use std::collections::HashSet;

/// Recomputes the Ancillary-ratio lines fed by `changed_item_ids` — principal lines that
/// arrived on the requisition, changed method, or left it — and the lines those feed in
/// turn, down the chain. A line left with no principal on the order takes the next
/// available default. Returns the lines whose forecast changed, which are saved.
///
/// The chain is walked as the ancillary refresh walks it: at most
/// [`MAX_ANCILLARY_DEPTH`] links deep, never revisiting a line on the current path, so a
/// cycle in the configured links (links arriving by sync aren't cycle-checked) can't feed
/// a line its own demand.
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
    let mut walk = Walk {
        inputs: &inputs,
        requisition,
        order: order_demand(&lines),
        path: HashSet::new(),
        updated: Vec::new(),
    };
    for item_id in &changed_item_ids {
        walk.recompute_fed_by(&mut lines, item_id, 0);
    }
    let updated = walk.updated;

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

struct Walk<'a> {
    inputs: &'a ForecastInputs,
    requisition: &'a RequisitionRow,
    order: OrderDemand,
    /// Items on the current path from a changed item
    path: HashSet<String>,
    /// Ids of the lines whose forecast changed
    updated: Vec<String>,
}

impl Walk<'_> {
    /// Recomputes the Ancillary-ratio lines `item_id` feeds, then the lines each of those
    /// feeds when its demand changed.
    fn recompute_fed_by(&mut self, lines: &mut [RequisitionLineRow], item_id: &str, depth: u32) {
        if depth >= MAX_ANCILLARY_DEPTH || !self.path.insert(item_id.to_string()) {
            return;
        }

        let fed: Vec<usize> = lines
            .iter()
            .enumerate()
            .filter(|(_, line)| {
                line.forecast_method == ForecastMethod::AncillaryRatio
                    && !self.path.contains(&line.item_id)
                    && self
                        .inputs
                        .principal_items(&line.item_id)
                        .any(|principal| principal == item_id)
            })
            .map(|(index, _)| index)
            .collect();

        for index in fed {
            let line = &mut lines[index];
            let forecast = match self.inputs.unavailable_reason(
                &ForecastMethod::AncillaryRatio,
                &line.item_id,
                &self.order,
            ) {
                None => self.inputs.forecast(
                    ForecastMethod::AncillaryRatio,
                    &line.item_id,
                    line.average_monthly_consumption,
                    &self.order,
                ),
                // The last principal left
                Some(_) => self.inputs.default_forecast(
                    &line.item_id,
                    line.average_monthly_consumption,
                    &self.order,
                ),
            };

            let before = line.clone();
            apply_forecast(line, forecast, self.requisition);
            if *line == before {
                continue;
            }
            self.order
                .insert(line.item_id.clone(), line.forecast_monthly_consumption);
            if !self.updated.contains(&line.id) {
                self.updated.push(line.id.clone());
            }
            let fed_item_id = line.item_id.clone();
            self.recompute_fed_by(lines, &fed_item_id, depth + 1);
        }

        self.path.remove(item_id);
    }
}
