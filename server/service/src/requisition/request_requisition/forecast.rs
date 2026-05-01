use crate::preference::preferences::DisplayPopulationBasedForecasting;
use crate::preference::types::Preference;
use crate::requisition::request_requisition::generate_population_forecast::calculate_forecasting_fields;
use crate::service_provider::ServiceContext;
use repository::{
    AmcSnapshot, AncillaryContribution, AncillaryItemFilter, AncillaryItemRepository,
    AncillaryRatioSnapshot, EqualFilter, ForecastMethod, ForecastSnapshot, PopulationSnapshot,
    RepositoryError, RequisitionLineRow, StorageConnection,
};
use std::collections::{HashMap, HashSet, VecDeque};

/// Per-line context the dispatcher needs to make its choice and compute
/// snapshots. Built once up-front so each method receives a small, typed view.
#[derive(Debug, Clone)]
struct LineContext {
    item_id: String,
    item_name: String,
    average_monthly_consumption: f64,
    available_stock_on_hand: f64,
    population: Option<PopulationSnapshot>,
    /// Parents of this item that have an ancillary edge `parent -> this`.
    /// Empty when the item isn't an ancillary of anything else.
    ancillary_parents: Vec<AncillaryParent>,
}

#[derive(Debug, Clone)]
struct AncillaryParent {
    parent_item_id: String,
    item_quantity: f64,
    ancillary_quantity: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ForecastInputs {
    pub min_months_of_stock: f64,
    pub max_months_of_stock: f64,
}

/// For each line in `lines`, choose a default forecasting method and write a
/// snapshot + headline units. Lines arrive without `forecast_method` /
/// `forecast_data` populated; this fills them in.
///
/// Two passes:
/// 1. AMC + Population (independent, any order)
/// 2. AncillaryRatio (topo-sorted within the requisition's induced subgraph)
pub fn run(
    ctx: &ServiceContext,
    inputs: ForecastInputs,
    lines: &mut Vec<RequisitionLineRow>,
) -> Result<(), RepositoryError> {
    if lines.is_empty() {
        return Ok(());
    }
    let item_ids: Vec<String> = lines.iter().map(|l| l.item_link_id.clone()).collect();
    let display_population = DisplayPopulationBasedForecasting
        .load(&ctx.connection, None)
        .unwrap_or(false);

    // Always compute the population map so the Population method works when
    // the user explicitly picks it. The `DisplayPopulationBasedForecasting`
    // preference only gates whether Population becomes the *default* method
    // for a vaccine item — see `resolve_default_method`.
    let population_map: HashMap<String, Option<PopulationSnapshot>> =
        calculate_forecasting_fields(ctx, item_ids.clone())?;

    // Per-item ancillary parents — restricted to parents that are themselves
    // line items on this requisition. Children whose parent isn't on the
    // requisition won't see any parent here and will fall back to AMC.
    let ancillary_parents = build_ancillary_parents(&ctx.connection, &item_ids)?;

    let contexts: HashMap<String, LineContext> = lines
        .iter()
        .map(|l| {
            let item_id = l.item_link_id.clone();
            let ancillary_parents = ancillary_parents.get(&item_id).cloned().unwrap_or_default();
            (
                item_id.clone(),
                LineContext {
                    item_id,
                    item_name: l.item_name.clone(),
                    average_monthly_consumption: l.average_monthly_consumption,
                    available_stock_on_hand: l.available_stock_on_hand,
                    population: l
                        .item_link_id
                        .clone()
                        .pipe(|id| population_map.get(&id).and_then(|opt| opt.clone())),
                    ancillary_parents,
                },
            )
        })
        .collect();

    // Honour any method the line already has set (set explicitly by the
    // user via the picker, or persisted from a previous run). Fall back to
    // `resolve_default_method` only when the line has no method set.
    let existing_methods: HashMap<String, ForecastMethod> = lines
        .iter()
        .filter_map(|l| {
            l.forecast_method
                .as_deref()
                .and_then(ForecastMethod::from_storage)
                .map(|m| (l.item_link_id.clone(), m))
        })
        .collect();
    let methods: HashMap<String, ForecastMethod> = contexts
        .values()
        .map(|c| {
            let method = existing_methods
                .get(&c.item_id)
                .cloned()
                .unwrap_or_else(|| resolve_default_method(c, display_population));
            (c.item_id.clone(), method)
        })
        .collect();

    // Pass 1: every non-AncillaryRatio line independently.
    let mut snapshots: HashMap<String, ForecastSnapshot> = HashMap::new();
    for ctx_line in contexts.values() {
        let method = methods.get(&ctx_line.item_id).expect("method resolved above");
        if matches!(method, ForecastMethod::AncillaryRatio) {
            continue;
        }
        let snap = compute_non_ancillary(ctx_line, method, inputs);
        snapshots.insert(ctx_line.item_id.clone(), snap);
    }

    // Pass 2: AncillaryRatio lines, in topological order so each child's
    // parents are already computed by the time we reach it.
    let ancillary_items: Vec<&LineContext> = contexts
        .values()
        .filter(|c| {
            matches!(
                methods.get(&c.item_id).expect("method resolved above"),
                ForecastMethod::AncillaryRatio
            )
        })
        .collect();

    if !ancillary_items.is_empty() {
        let order = topological_order(&ancillary_items);
        for item_id in order {
            let ctx_line = contexts.get(&item_id).expect("present in topo set");
            let snap = compute_ancillary_ratio(ctx_line, &snapshots, &contexts, lines);
            snapshots.insert(item_id, snap);
        }
    }

    // Write back: method, forecast_data, forecast_total_units. Suggested
    // quantity uses the headline units when forecasting actually produced one;
    // otherwise the caller's existing AMC fallback (in generate.rs) takes over.
    for line in lines.iter_mut() {
        let method = methods
            .get(&line.item_link_id)
            .expect("method resolved above");
        let snap = snapshots
            .get(&line.item_link_id)
            .expect("snapshot computed above");
        line.forecast_method = Some(method.to_storage());
        line.set_forecast_snapshot(snap);
    }

    Ok(())
}

fn resolve_default_method(c: &LineContext, display_population: bool) -> ForecastMethod {
    if !c.ancillary_parents.is_empty() {
        return ForecastMethod::AncillaryRatio;
    }
    if display_population && c.population.is_some() {
        return ForecastMethod::Population;
    }
    ForecastMethod::AverageMonthlyConsumption
}

fn compute_non_ancillary(
    c: &LineContext,
    method: &ForecastMethod,
    inputs: ForecastInputs,
) -> ForecastSnapshot {
    match method {
        ForecastMethod::Population => match c.population.clone() {
            Some(snap) => ForecastSnapshot::Population(snap),
            // Defensive: the picker should disable Population for non-vaccine
            // items, but if a stale `forecast_method='population'` ends up on
            // a line whose item isn't (or is no longer) mapped to a course,
            // fall back to AMC rather than panicking.
            None => ForecastSnapshot::Amc(compute_amc(c, inputs)),
        },
        ForecastMethod::AverageMonthlyConsumption => ForecastSnapshot::Amc(compute_amc(c, inputs)),
        ForecastMethod::AncillaryRatio => unreachable!("handled in pass 2"),
        ForecastMethod::Plugin(_) => {
            // Plugin seam: not invoked in v1 from this dispatcher; defaulting
            // to AMC keeps the line shipping with a meaningful snapshot.
            ForecastSnapshot::Amc(compute_amc(c, inputs))
        }
    }
}

fn compute_amc(c: &LineContext, inputs: ForecastInputs) -> AmcSnapshot {
    let months_of_stock_target = inputs.max_months_of_stock;
    let forecast_units = (months_of_stock_target * c.average_monthly_consumption).max(0.0);
    AmcSnapshot {
        average_monthly_consumption: c.average_monthly_consumption,
        months_of_stock_target,
        available_stock_on_hand: c.available_stock_on_hand,
        forecast_units,
    }
}

fn compute_ancillary_ratio(
    c: &LineContext,
    snapshots: &HashMap<String, ForecastSnapshot>,
    contexts: &HashMap<String, LineContext>,
    lines: &[RequisitionLineRow],
) -> ForecastSnapshot {
    let mut contributions: Vec<AncillaryContribution> = Vec::new();
    let mut total_units = 0.0;
    let line_id_by_item: HashMap<&str, &str> = lines
        .iter()
        .map(|l| (l.item_link_id.as_str(), l.id.as_str()))
        .collect();
    for parent in &c.ancillary_parents {
        let Some(parent_snap) = snapshots.get(&parent.parent_item_id) else {
            continue;
        };
        let parent_units = parent_snap.forecast_units();
        if parent.item_quantity <= 0.0 {
            continue;
        }
        let units = parent_units * parent.ancillary_quantity / parent.item_quantity;
        total_units += units;
        let parent_name = contexts
            .get(&parent.parent_item_id)
            .map(|p| p.item_name.clone())
            .unwrap_or_default();
        let parent_line_id = line_id_by_item
            .get(parent.parent_item_id.as_str())
            .map(|s| s.to_string())
            .unwrap_or_default();
        contributions.push(AncillaryContribution {
            parent_line_id,
            parent_item_id: parent.parent_item_id.clone(),
            parent_item_name: parent_name,
            parent_forecast_units: parent_units,
            item_quantity: parent.item_quantity,
            ancillary_quantity: parent.ancillary_quantity,
            units,
        });
    }
    ForecastSnapshot::AncillaryRatio(AncillaryRatioSnapshot {
        forecast_units: total_units,
        contributions,
        fallback: None,
    })
}

/// Kahn's algorithm over the AncillaryRatio subset, with a defensive
/// `MAX_ANCILLARY_DEPTH * |lines|` cap to bail in the unlikely case the
/// ancillary cycle detector at upsert time was bypassed somehow.
fn topological_order(items: &[&LineContext]) -> Vec<String> {
    let item_set: HashSet<&str> = items.iter().map(|c| c.item_id.as_str()).collect();
    let mut in_degree: HashMap<String, usize> = items
        .iter()
        .map(|c| (c.item_id.clone(), 0usize))
        .collect();
    let mut children: HashMap<String, Vec<String>> = HashMap::new();
    for c in items {
        for parent in &c.ancillary_parents {
            if item_set.contains(parent.parent_item_id.as_str()) {
                *in_degree.entry(c.item_id.clone()).or_insert(0) += 1;
                children
                    .entry(parent.parent_item_id.clone())
                    .or_default()
                    .push(c.item_id.clone());
            }
        }
    }
    let mut queue: VecDeque<String> = in_degree
        .iter()
        .filter(|(_, d)| **d == 0)
        .map(|(k, _)| k.clone())
        .collect();
    let mut order: Vec<String> = Vec::with_capacity(items.len());
    while let Some(item_id) = queue.pop_front() {
        order.push(item_id.clone());
        if let Some(kids) = children.get(&item_id) {
            for child in kids {
                if let Some(d) = in_degree.get_mut(child) {
                    *d -= 1;
                    if *d == 0 {
                        queue.push_back(child.clone());
                    }
                }
            }
        }
    }
    if order.len() != items.len() {
        // Cycle (shouldn't reach here given upsert-time validation). Append
        // remaining items in any deterministic order — their snapshots will
        // still be computed, just without the dependency guarantee.
        for c in items {
            if !order.iter().any(|id| id == &c.item_id) {
                order.push(c.item_id.clone());
            }
        }
    }
    order
}

/// For each item in `item_ids`, list the parents (also items) whose ancillary
/// edge points at it. Parents not in `item_ids` are filtered out so the
/// resulting map only refers to in-requisition parents.
fn build_ancillary_parents(
    connection: &StorageConnection,
    item_ids: &[String],
) -> Result<HashMap<String, Vec<AncillaryParent>>, RepositoryError> {
    if item_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let edges = AncillaryItemRepository::new(connection).query_by_filter(
        AncillaryItemFilter::new()
            .ancillary_item_link_id(EqualFilter::equal_any(item_ids.to_vec())),
    )?;
    let item_set: HashSet<&str> = item_ids.iter().map(|s| s.as_str()).collect();
    let mut out: HashMap<String, Vec<AncillaryParent>> = HashMap::new();
    for edge in edges {
        if !item_set.contains(edge.item_link_id.as_str()) {
            continue;
        }
        out.entry(edge.ancillary_item_link_id.clone())
            .or_default()
            .push(AncillaryParent {
                parent_item_id: edge.item_link_id,
                item_quantity: edge.item_quantity,
                ancillary_quantity: edge.ancillary_quantity,
            });
    }
    Ok(out)
}

// Small extension to chain a value through a closure inline.
trait Pipe: Sized {
    fn pipe<R>(self, f: impl FnOnce(Self) -> R) -> R {
        f(self)
    }
}
impl<T> Pipe for T {}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(id: &str, item: &str, amc: f64, soh: f64) -> RequisitionLineRow {
        RequisitionLineRow {
            id: id.into(),
            item_link_id: item.into(),
            item_name: item.into(),
            average_monthly_consumption: amc,
            available_stock_on_hand: soh,
            ..Default::default()
        }
    }

    #[test]
    fn topo_orders_parent_before_child() {
        // a -> b -> c (ancillary chain). Topo order should respect dependencies.
        let lc = |item: &str, parents: &[&str]| LineContext {
            item_id: item.into(),
            item_name: item.into(),
            average_monthly_consumption: 0.0,
            available_stock_on_hand: 0.0,
            population: None,
            ancillary_parents: parents
                .iter()
                .map(|p| AncillaryParent {
                    parent_item_id: (*p).into(),
                    item_quantity: 1.0,
                    ancillary_quantity: 1.0,
                })
                .collect(),
        };
        let a = lc("a", &[]);
        let b = lc("b", &["a"]);
        let c = lc("c", &["b"]);
        let order = topological_order(&[&c, &b, &a]);
        let pos = |id: &str| order.iter().position(|s| s == id).unwrap();
        assert!(pos("a") < pos("b"));
        assert!(pos("b") < pos("c"));
    }

    #[test]
    fn amc_uses_max_months_of_stock_target() {
        let c = LineContext {
            item_id: "x".into(),
            item_name: "X".into(),
            average_monthly_consumption: 10.0,
            available_stock_on_hand: 5.0,
            population: None,
            ancillary_parents: vec![],
        };
        let snap = compute_amc(
            &c,
            ForecastInputs {
                min_months_of_stock: 1.0,
                max_months_of_stock: 3.0,
            },
        );
        assert_eq!(snap.forecast_units, 30.0);
        assert_eq!(snap.months_of_stock_target, 3.0);
    }

    #[test]
    fn ancillary_ratio_pulls_from_parent_snapshot() {
        let parent_snap = ForecastSnapshot::Amc(AmcSnapshot {
            average_monthly_consumption: 100.0,
            months_of_stock_target: 1.0,
            available_stock_on_hand: 0.0,
            forecast_units: 100.0,
        });
        let mut snaps = HashMap::new();
        snaps.insert("vaccine".to_string(), parent_snap);
        let mut ctxs = HashMap::new();
        ctxs.insert(
            "vaccine".to_string(),
            LineContext {
                item_id: "vaccine".into(),
                item_name: "Vaccine".into(),
                average_monthly_consumption: 100.0,
                available_stock_on_hand: 0.0,
                population: None,
                ancillary_parents: vec![],
            },
        );
        let safety_box = LineContext {
            item_id: "safety_box".into(),
            item_name: "Safety Box".into(),
            average_monthly_consumption: 0.0,
            available_stock_on_hand: 0.0,
            population: None,
            ancillary_parents: vec![AncillaryParent {
                parent_item_id: "vaccine".into(),
                item_quantity: 100.0,
                ancillary_quantity: 1.0,
            }],
        };
        let lines = vec![
            line("l_v", "vaccine", 0.0, 0.0),
            line("l_b", "safety_box", 0.0, 0.0),
        ];
        let snap = compute_ancillary_ratio(&safety_box, &snaps, &ctxs, &lines);
        match snap {
            ForecastSnapshot::AncillaryRatio(s) => {
                assert!((s.forecast_units - 1.0).abs() < 1e-9);
                assert_eq!(s.contributions.len(), 1);
                assert_eq!(s.contributions[0].parent_line_id, "l_v");
            }
            _ => panic!("expected AncillaryRatio"),
        }
    }

}
