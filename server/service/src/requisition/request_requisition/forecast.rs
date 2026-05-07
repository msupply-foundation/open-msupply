use crate::item_stats::{get_item_stats, AmcBreakdown};
use topological_sort::TopologicalSort;
use crate::preference::preferences::DisplayPopulationBasedForecasting;
use crate::preference::types::Preference;
use crate::requisition::request_requisition::generate_population_forecast::calculate_forecasting_fields;
use crate::service_provider::ServiceContext;
use crate::PluginOrRepositoryError;
use repository::{
    AmcSnapshot, AmcSnapshotBreakdown, AncillaryContribution, AncillaryItemFilter,
    AncillaryItemRepository, AncillaryRatioSnapshot, DefaultAmcSnapshotBreakdown, EqualFilter,
    ForecastMethod, ForecastSnapshot, PopulationSnapshot, RepositoryError, RequisitionLineRow,
    StorageConnection,
};
use std::collections::{HashMap, HashSet};

/// Per-line context the dispatcher needs to make its choice and compute
/// snapshots. Built once up-front so each method receives a small, typed view.
#[derive(Debug, Clone)]
struct LineContext {
    item_id: String,
    item_name: String,
    average_monthly_consumption: f64,
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

/// For each line in `lines`, choose a default forecasting method and write a
/// snapshot + headline monthly usage rate. Lines arrive without
/// `forecast_method` / `forecast_data` populated; this fills them in.
///
/// Forecasting outputs a *rate* — stock-management settings (min/max months of
/// stock, course supply periods) live with the stock-management module.
///
/// Two passes:
/// 1. AMC + Population (independent, any order)
/// 2. AncillaryRatio (topo-sorted within the requisition's induced subgraph)
pub fn run(
    ctx: &ServiceContext,
    lines: &mut Vec<RequisitionLineRow>,
) -> Result<(), PluginOrRepositoryError> {
    if lines.is_empty() {
        return Ok(());
    }
    let item_ids: Vec<String> = lines.iter().map(|l| l.item_link_id.clone()).collect();
    let display_population = DisplayPopulationBasedForecasting
        .load(&ctx.connection, None)
        .unwrap_or(false);

    // Re-compute AMC breakdowns from current item stats every time so the
    // calculation explanation matches today's data — including method
    // switches like Population → AMC, where the line has no previous AMC
    // breakdown to carry forward.
    let amc_breakdowns: HashMap<String, AmcBreakdown> = get_item_stats(
        &ctx.connection,
        &ctx.store_id,
        None,
        item_ids.clone(),
        None,
    )?
    .into_iter()
    .filter_map(|s| {
        let item_id = s.item_id.clone();
        s.amc_breakdown.map(|b| (item_id, b))
    })
    .collect();

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
        let snap = compute_non_ancillary(
            ctx_line,
            method,
            amc_breakdowns.get(&ctx_line.item_id),
        );
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

    // Topologically sort AncillaryRatio lines so each child's parents are
    // computed before it. Items left after the iterator drains had a cycle
    // (cycle detection at upsert time should prevent this); compute their
    // snapshots anyway so the line still ships.
    let item_set: HashSet<&str> = ancillary_items.iter().map(|c| c.item_id.as_str()).collect();
    let mut ts = TopologicalSort::<String>::new();
    for c in &ancillary_items {
        ts.insert(c.item_id.clone());
        for parent in &c.ancillary_parents {
            if item_set.contains(parent.parent_item_id.as_str()) {
                ts.add_dependency(parent.parent_item_id.clone(), c.item_id.clone());
            }
        }
    }
    while let Some(item_id) = ts.pop() {
        let ctx_line = contexts.get(&item_id).expect("present in sort set");
        let snap = compute_ancillary_ratio(ctx_line, &snapshots, &contexts, lines);
        snapshots.insert(item_id, snap);
    }
    for c in &ancillary_items {
        if !snapshots.contains_key(&c.item_id) {
            let snap = compute_ancillary_ratio(c, &snapshots, &contexts, lines);
            snapshots.insert(c.item_id.clone(), snap);
        }
    }

    // Write back: method, forecast_data, forecast_monthly_usage. The method
    // tag is derived from the snapshot variant rather than the requested
    // method so a Population fallback to AMC (item not mapped to a vaccine
    // course) doesn't drift the tag out of sync with the stored snapshot.
    for line in lines.iter_mut() {
        let snap = snapshots
            .get(&line.item_link_id)
            .expect("snapshot computed above");
        line.forecast_method = Some(method_for_snapshot(snap).to_storage());
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
    fresh_breakdown: Option<&AmcBreakdown>,
) -> ForecastSnapshot {
    match method {
        ForecastMethod::Population => match c.population.clone() {
            Some(snap) => ForecastSnapshot::Population(snap),
            // Defensive: the picker should disable Population for non-vaccine
            // items, but if a stale `forecast_method='population'` ends up on
            // a line whose item isn't (or is no longer) mapped to a course,
            // fall back to AMC rather than panicking.
            None => ForecastSnapshot::Amc(compute_amc(c, fresh_breakdown)),
        },
        ForecastMethod::AverageMonthlyConsumption => {
            ForecastSnapshot::Amc(compute_amc(c, fresh_breakdown))
        }
        ForecastMethod::AncillaryRatio => unreachable!("handled in pass 2"),
        ForecastMethod::Plugin(_) => {
            // Plugin seam: not invoked in v1 from this dispatcher; defaulting
            // to AMC keeps the line shipping with a meaningful snapshot.
            ForecastSnapshot::Amc(compute_amc(c, fresh_breakdown))
        }
    }
}

fn compute_amc(c: &LineContext, fresh_breakdown: Option<&AmcBreakdown>) -> AmcSnapshot {
    // Breakdown is recomputed via `get_item_stats` at the top of `run`; the
    // empty fallback only fires for a line whose item didn't appear in the
    // results (shouldn't happen in practice — defensive).
    let breakdown = fresh_breakdown
        .map(amc_breakdown_to_snapshot)
        .unwrap_or_else(|| {
            AmcSnapshotBreakdown::Default(DefaultAmcSnapshotBreakdown {
                lookback_months: 0.0,
                total_consumption: 0.0,
                number_of_days: 0.0,
                days_out_of_stock: None,
                dos_adjustment_factor: 1.0,
            })
        });
    AmcSnapshot {
        forecast_monthly_usage: c.average_monthly_consumption.max(0.0),
        breakdown,
    }
}

fn method_for_snapshot(snap: &ForecastSnapshot) -> ForecastMethod {
    match snap {
        ForecastSnapshot::Amc(_) => ForecastMethod::AverageMonthlyConsumption,
        ForecastSnapshot::Population(_) => ForecastMethod::Population,
        ForecastSnapshot::AncillaryRatio(_) => ForecastMethod::AncillaryRatio,
        ForecastSnapshot::Plugin(s) => ForecastMethod::Plugin(s.plugin_code.clone()),
    }
}

fn amc_breakdown_to_snapshot(b: &AmcBreakdown) -> AmcSnapshotBreakdown {
    match b {
        AmcBreakdown::Plugin { code } => AmcSnapshotBreakdown::Plugin { code: code.clone() },
        AmcBreakdown::Default(d) => AmcSnapshotBreakdown::Default(DefaultAmcSnapshotBreakdown {
            lookback_months: d.lookback_months,
            total_consumption: d.total_consumption,
            number_of_days: d.number_of_days,
            days_out_of_stock: d.days_out_of_stock,
            dos_adjustment_factor: d.dos_adjustment_factor,
        }),
    }
}

fn compute_ancillary_ratio(
    c: &LineContext,
    snapshots: &HashMap<String, ForecastSnapshot>,
    contexts: &HashMap<String, LineContext>,
    lines: &[RequisitionLineRow],
) -> ForecastSnapshot {
    let mut contributions: Vec<AncillaryContribution> = Vec::new();
    let mut total_monthly_usage = 0.0;
    let line_id_by_item: HashMap<&str, &str> = lines
        .iter()
        .map(|l| (l.item_link_id.as_str(), l.id.as_str()))
        .collect();
    for parent in &c.ancillary_parents {
        let Some(parent_snap) = snapshots.get(&parent.parent_item_id) else {
            continue;
        };
        let parent_monthly_usage = parent_snap.forecast_monthly_usage();
        if parent.item_quantity <= 0.0 {
            continue;
        }
        let monthly_usage =
            parent_monthly_usage * parent.ancillary_quantity / parent.item_quantity;
        total_monthly_usage += monthly_usage;
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
            parent_forecast_monthly_usage: parent_monthly_usage,
            item_quantity: parent.item_quantity,
            ancillary_quantity: parent.ancillary_quantity,
            monthly_usage,
        });
    }
    ForecastSnapshot::AncillaryRatio(AncillaryRatioSnapshot {
        forecast_monthly_usage: total_monthly_usage,
        contributions,
        fallback: None,
    })
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
            .ancillary_item_id(EqualFilter::equal_any(item_ids.to_vec())),
    )?;
    let item_set: HashSet<&str> = item_ids.iter().map(|s| s.as_str()).collect();
    let mut out: HashMap<String, Vec<AncillaryParent>> = HashMap::new();
    for edge in edges {
        if !item_set.contains(edge.item_id.as_str()) {
            continue;
        }
        out.entry(edge.ancillary_item_id.clone())
            .or_default()
            .push(AncillaryParent {
                parent_item_id: edge.item_id,
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
    fn amc_snapshot_uses_fresh_breakdown() {
        use crate::item_stats::DefaultAmcBreakdown;
        let c = LineContext {
            item_id: "x".into(),
            item_name: "X".into(),
            average_monthly_consumption: 7.0,
            population: None,
            ancillary_parents: vec![],
        };
        let fresh = AmcBreakdown::Default(DefaultAmcBreakdown {
            lookback_months: 6.0,
            total_consumption: 42.0,
            number_of_days: 182.0,
            days_out_of_stock: Some(10.0),
            dos_adjustment_factor: 182.0 / 172.0,
        });
        let snap = compute_amc(&c, Some(&fresh));
        assert_eq!(snap.forecast_monthly_usage, 7.0);
        match snap.breakdown {
            AmcSnapshotBreakdown::Default(d) => {
                assert_eq!(d.lookback_months, 6.0);
                assert_eq!(d.total_consumption, 42.0);
                assert_eq!(d.days_out_of_stock, Some(10.0));
            }
            _ => panic!("expected Default breakdown"),
        }
    }

    #[test]
    fn amc_snapshot_falls_back_when_breakdown_missing() {
        let c = LineContext {
            item_id: "x".into(),
            item_name: "X".into(),
            average_monthly_consumption: 10.0,
            population: None,
            ancillary_parents: vec![],
        };
        let snap = compute_amc(&c, None);
        assert_eq!(snap.forecast_monthly_usage, 10.0);
        match snap.breakdown {
            AmcSnapshotBreakdown::Default(d) => {
                assert_eq!(d.lookback_months, 0.0);
                assert_eq!(d.total_consumption, 0.0);
            }
            _ => panic!("expected Default fallback"),
        }
    }

    #[test]
    fn ancillary_ratio_pulls_from_parent_snapshot() {
        // Parent vaccine has rate 100/month; safety_box ratio 1 per 100 vaccines
        // → child rate is 1/month, regardless of stock-management horizons.
        let parent_snap = ForecastSnapshot::Amc(AmcSnapshot {
            forecast_monthly_usage: 100.0,
            breakdown: AmcSnapshotBreakdown::Default(DefaultAmcSnapshotBreakdown {
                lookback_months: 3.0,
                total_consumption: 300.0,
                number_of_days: 91.0,
                days_out_of_stock: None,
                dos_adjustment_factor: 1.0,
            }),
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
                population: None,
                ancillary_parents: vec![],
            },
        );
        let safety_box = LineContext {
            item_id: "safety_box".into(),
            item_name: "Safety Box".into(),
            average_monthly_consumption: 0.0,
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
                assert!((s.forecast_monthly_usage - 1.0).abs() < 1e-9);
                assert_eq!(s.contributions.len(), 1);
                assert_eq!(s.contributions[0].parent_line_id, "l_v");
                assert!((s.contributions[0].monthly_usage - 1.0).abs() < 1e-9);
            }
            _ => panic!("expected AncillaryRatio"),
        }
    }
}
