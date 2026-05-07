use crate::backend_plugin::plugin_provider::PluginInstance;
use crate::backend_plugin::types::forecast_method as plugin_forecast_method;
use crate::backend_plugin::types::forecast_method::ForecastLineContext as PluginLineContext;
use crate::item_stats::{get_item_stats, AmcBreakdown};
use crate::preference::preferences::DisplayPopulationBasedForecasting;
use crate::preference::types::Preference;
use crate::requisition::request_requisition::generate_population_forecast::{
    calculate_forecasting_fields, PopulationLookup,
};
use crate::service_provider::ServiceContext;
use crate::PluginOrRepositoryError;
use repository::{
    AmcError, AmcOutcome, AmcSnapshot, AmcSnapshotBreakdown, AncillaryContribution,
    AncillaryItemFilter, AncillaryItemRepository, AncillaryRatioError, AncillaryRatioOutcome,
    AncillaryRatioSnapshot, DefaultAmcSnapshotBreakdown, EqualFilter, ForecastMethod,
    ForecastSnapshot, PluginError, PluginOutcome, PluginSnapshot, PluginType, PopulationError,
    PopulationOutcome, RepositoryError, RequisitionLineRow, StorageConnection,
};
use topological_sort::TopologicalSort;
use std::collections::{HashMap, HashSet};

/// Per-line context the dispatcher needs to make its choice and compute
/// snapshots. Built once up-front so each method receives a small, typed view.
#[derive(Debug, Clone)]
struct LineContext {
    line_id: String,
    item_id: String,
    item_name: String,
    average_monthly_consumption: f64,
    available_stock_on_hand: f64,
    /// `Ok` for items with course data, otherwise carries the population-side
    /// failure (missing store config / no course mapped) so the dispatcher can
    /// surface it on lines whose method is `Population`.
    population: PopulationLookup,
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
/// 1. AMC + Population + Plugin (independent, any order)
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
    let requisition_id = lines
        .first()
        .map(|l| l.requisition_id.clone())
        .unwrap_or_default();

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
    let population_map: HashMap<String, PopulationLookup> =
        calculate_forecasting_fields(ctx, item_ids.clone())?;

    // Per-item ancillary parents — restricted to parents that are themselves
    // line items on this requisition. Children whose parent isn't on the
    // requisition error out under the AncillaryRatio method.
    let ancillary_parents = build_ancillary_parents(&ctx.connection, &item_ids)?;

    let contexts: HashMap<String, LineContext> = lines
        .iter()
        .map(|l| {
            let item_id = l.item_link_id.clone();
            let ancillary_parents = ancillary_parents.get(&item_id).cloned().unwrap_or_default();
            let population = population_map
                .get(&item_id)
                .cloned()
                .unwrap_or(PopulationLookup::NoCourseForItem);
            (
                item_id.clone(),
                LineContext {
                    line_id: l.id.clone(),
                    item_id,
                    item_name: l.item_name.clone(),
                    average_monthly_consumption: l.average_monthly_consumption,
                    available_stock_on_hand: l.available_stock_on_hand,
                    population,
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
            &ctx.store_id,
            &requisition_id,
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
    // tag is derived from the snapshot variant so a stored Error outcome
    // still tags itself with the attempted method.
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
    if display_population && matches!(c.population, PopulationLookup::Ok(_)) {
        return ForecastMethod::Population;
    }
    ForecastMethod::AverageMonthlyConsumption
}

fn compute_non_ancillary(
    c: &LineContext,
    method: &ForecastMethod,
    fresh_breakdown: Option<&AmcBreakdown>,
    store_id: &str,
    requisition_id: &str,
) -> ForecastSnapshot {
    match method {
        ForecastMethod::Population => match &c.population {
            PopulationLookup::Ok(snap) => {
                ForecastSnapshot::Population(PopulationOutcome::Ok(snap.clone()))
            }
            PopulationLookup::NoCourseForItem => ForecastSnapshot::Population(
                PopulationOutcome::Error(PopulationError::NoVaccineCourseForItem {
                    item_id: c.item_id.clone(),
                }),
            ),
            PopulationLookup::MissingStoreConfig { missing_fields } => ForecastSnapshot::Population(
                PopulationOutcome::Error(PopulationError::MissingStoreConfig {
                    store_id: store_id.to_string(),
                    missing_fields: missing_fields.clone(),
                }),
            ),
        },
        ForecastMethod::AverageMonthlyConsumption => {
            ForecastSnapshot::Amc(compute_amc(c, fresh_breakdown))
        }
        ForecastMethod::AncillaryRatio => unreachable!("handled in pass 2"),
        ForecastMethod::Plugin(code) => {
            ForecastSnapshot::Plugin(invoke_plugin(c, code, store_id, requisition_id))
        }
    }
}

fn compute_amc(c: &LineContext, fresh_breakdown: Option<&AmcBreakdown>) -> AmcOutcome {
    // No consumption recorded → rendering an empty AMC breakdown would be
    // misleading. Surface the failure so the modal explains why suggested
    // quantity is `0`.
    if c.average_monthly_consumption <= 0.0 {
        let lookback_months = match fresh_breakdown {
            Some(AmcBreakdown::Default(d)) => d.lookback_months,
            _ => 0.0,
        };
        return AmcOutcome::Error(AmcError::NoConsumptionHistory { lookback_months });
    }
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
    AmcOutcome::Ok(AmcSnapshot {
        forecast_monthly_usage: c.average_monthly_consumption,
        breakdown,
    })
}

fn invoke_plugin(
    c: &LineContext,
    code: &str,
    store_id: &str,
    requisition_id: &str,
) -> PluginOutcome {
    let Some(instance) = PluginInstance::get_one_with_code(code, PluginType::ForecastMethod) else {
        return PluginOutcome::Error(PluginError::NotFound {
            plugin_code: code.to_string(),
        });
    };
    let plugin_version = instance.version.to_string();
    let input = plugin_forecast_method::Input {
        store_id: store_id.to_string(),
        requisition_id: requisition_id.to_string(),
        line: PluginLineContext {
            line_id: c.line_id.clone(),
            item_id: c.item_id.clone(),
            item_name: c.item_name.clone(),
            average_monthly_consumption: c.average_monthly_consumption,
            available_stock_on_hand: c.available_stock_on_hand,
            forecast_monthly_usage: None,
        },
        // Plugin-defined methods don't get the parent context that Ancillary
        // does — they run in pass 1, before any other line is computed. If we
        // grow plugin methods that need parents, lift this into the topo pass.
        parent_lines: Vec::new(),
    };
    match plugin_forecast_method::Trait::call(&*instance, input) {
        Ok(output) => PluginOutcome::Ok(PluginSnapshot {
            plugin_code: code.to_string(),
            plugin_version,
            forecast_monthly_usage: output.forecast_monthly_usage,
            forecast_doses: output.forecast_doses,
            display: output.display,
        }),
        Err(err) => PluginOutcome::Error(PluginError::InvocationFailed {
            plugin_code: code.to_string(),
            plugin_version,
            message: format!("{err:?}"),
        }),
    }
}

fn method_for_snapshot(snap: &ForecastSnapshot) -> ForecastMethod {
    match snap {
        ForecastSnapshot::Amc(_) => ForecastMethod::AverageMonthlyConsumption,
        ForecastSnapshot::Population(_) => ForecastMethod::Population,
        ForecastSnapshot::AncillaryRatio(_) => ForecastMethod::AncillaryRatio,
        ForecastSnapshot::Plugin(PluginOutcome::Ok(s)) => {
            ForecastMethod::Plugin(s.plugin_code.clone())
        }
        ForecastSnapshot::Plugin(PluginOutcome::Error(e)) => {
            let code = match e {
                PluginError::NotFound { plugin_code }
                | PluginError::InvocationFailed { plugin_code, .. } => plugin_code.clone(),
            };
            ForecastMethod::Plugin(code)
        }
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
    if contributions.is_empty() {
        return ForecastSnapshot::AncillaryRatio(AncillaryRatioOutcome::Error(
            AncillaryRatioError::NoParentsInRequisition {
                item_id: c.item_id.clone(),
            },
        ));
    }
    ForecastSnapshot::AncillaryRatio(AncillaryRatioOutcome::Ok(AncillaryRatioSnapshot {
        forecast_monthly_usage: total_monthly_usage,
        contributions,
    }))
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

#[cfg(test)]
mod tests {
    use super::*;
    use repository::MissingStoreField;

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

    fn ctx(item: &str, amc: f64) -> LineContext {
        LineContext {
            line_id: format!("l_{item}"),
            item_id: item.into(),
            item_name: item.into(),
            average_monthly_consumption: amc,
            available_stock_on_hand: 0.0,
            population: PopulationLookup::NoCourseForItem,
            ancillary_parents: vec![],
        }
    }

    #[test]
    fn amc_snapshot_uses_fresh_breakdown() {
        use crate::item_stats::DefaultAmcBreakdown;
        let c = ctx("x", 7.0);
        let fresh = AmcBreakdown::Default(DefaultAmcBreakdown {
            lookback_months: 6.0,
            total_consumption: 42.0,
            number_of_days: 182.0,
            days_out_of_stock: Some(10.0),
            dos_adjustment_factor: 182.0 / 172.0,
        });
        match compute_amc(&c, Some(&fresh)) {
            AmcOutcome::Ok(snap) => {
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
            other => panic!("expected Ok, got {other:?}"),
        }
    }

    #[test]
    fn amc_errors_when_no_consumption() {
        let c = ctx("x", 0.0);
        match compute_amc(&c, None) {
            AmcOutcome::Error(AmcError::NoConsumptionHistory { lookback_months }) => {
                assert_eq!(lookback_months, 0.0);
            }
            other => panic!("expected NoConsumptionHistory, got {other:?}"),
        }
    }

    #[test]
    fn population_method_with_no_course_errors() {
        let c = LineContext {
            population: PopulationLookup::NoCourseForItem,
            ..ctx("vaccine_x", 5.0)
        };
        let snap = compute_non_ancillary(&c, &ForecastMethod::Population, None, "store_a", "req_1");
        match snap {
            ForecastSnapshot::Population(PopulationOutcome::Error(
                PopulationError::NoVaccineCourseForItem { item_id },
            )) => {
                assert_eq!(item_id, "vaccine_x");
            }
            other => panic!("expected NoVaccineCourseForItem, got {other:?}"),
        }
    }

    #[test]
    fn population_method_with_missing_store_config_errors() {
        let c = LineContext {
            population: PopulationLookup::MissingStoreConfig {
                missing_fields: vec![
                    MissingStoreField::PopulationServed,
                    MissingStoreField::SupplyInterval,
                ],
            },
            ..ctx("vaccine_y", 5.0)
        };
        let snap = compute_non_ancillary(&c, &ForecastMethod::Population, None, "store_a", "req_1");
        match snap {
            ForecastSnapshot::Population(PopulationOutcome::Error(
                PopulationError::MissingStoreConfig {
                    store_id,
                    missing_fields,
                },
            )) => {
                assert_eq!(store_id, "store_a");
                assert_eq!(missing_fields.len(), 2);
            }
            other => panic!("expected MissingStoreConfig, got {other:?}"),
        }
    }

    #[test]
    fn plugin_method_with_unknown_code_errors() {
        let c = ctx("x", 5.0);
        let snap = compute_non_ancillary(
            &c,
            &ForecastMethod::Plugin("does_not_exist".into()),
            None,
            "store_a",
            "req_1",
        );
        match snap {
            ForecastSnapshot::Plugin(PluginOutcome::Error(PluginError::NotFound {
                plugin_code,
            })) => {
                assert_eq!(plugin_code, "does_not_exist");
            }
            other => panic!("expected PluginError::NotFound, got {other:?}"),
        }
    }

    #[test]
    fn ancillary_ratio_errors_when_no_parents_on_requisition() {
        let item_ctx = LineContext {
            ancillary_parents: vec![AncillaryParent {
                parent_item_id: "parent_not_on_requisition".into(),
                item_quantity: 100.0,
                ancillary_quantity: 1.0,
            }],
            ..ctx("safety_box", 0.0)
        };
        let mut ctxs = HashMap::new();
        ctxs.insert(item_ctx.item_id.clone(), item_ctx.clone());
        let snaps = HashMap::new();
        let lines = vec![line("l_b", "safety_box", 0.0, 0.0)];
        let snap = compute_ancillary_ratio(&item_ctx, &snaps, &ctxs, &lines);
        match snap {
            ForecastSnapshot::AncillaryRatio(AncillaryRatioOutcome::Error(
                AncillaryRatioError::NoParentsInRequisition { item_id },
            )) => {
                assert_eq!(item_id, "safety_box");
            }
            other => panic!("expected NoParentsInRequisition, got {other:?}"),
        }
    }

    #[test]
    fn ancillary_ratio_pulls_from_parent_snapshot() {
        // Parent vaccine has rate 100/month; safety_box ratio 1 per 100 vaccines
        // → child rate is 1/month, regardless of stock-management horizons.
        use repository::DefaultAmcSnapshotBreakdown;
        let parent_snap = ForecastSnapshot::Amc(AmcOutcome::Ok(AmcSnapshot {
            forecast_monthly_usage: 100.0,
            breakdown: AmcSnapshotBreakdown::Default(DefaultAmcSnapshotBreakdown {
                lookback_months: 3.0,
                total_consumption: 300.0,
                number_of_days: 91.0,
                days_out_of_stock: None,
                dos_adjustment_factor: 1.0,
            }),
        }));
        let mut snaps = HashMap::new();
        snaps.insert("vaccine".to_string(), parent_snap);
        let mut ctxs = HashMap::new();
        ctxs.insert("vaccine".to_string(), ctx("vaccine", 100.0));
        let safety_box = LineContext {
            ancillary_parents: vec![AncillaryParent {
                parent_item_id: "vaccine".into(),
                item_quantity: 100.0,
                ancillary_quantity: 1.0,
            }],
            ..ctx("safety_box", 0.0)
        };
        let lines = vec![
            line("l_v", "vaccine", 0.0, 0.0),
            line("l_b", "safety_box", 0.0, 0.0),
        ];
        let snap = compute_ancillary_ratio(&safety_box, &snaps, &ctxs, &lines);
        match snap {
            ForecastSnapshot::AncillaryRatio(AncillaryRatioOutcome::Ok(s)) => {
                assert!((s.forecast_monthly_usage - 1.0).abs() < 1e-9);
                assert_eq!(s.contributions.len(), 1);
                assert_eq!(s.contributions[0].parent_line_id, "l_v");
                assert!((s.contributions[0].monthly_usage - 1.0).abs() < 1e-9);
            }
            _ => panic!("expected AncillaryRatio Ok"),
        }
    }
}
