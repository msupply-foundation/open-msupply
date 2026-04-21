use repository::{ancillary_item_row::AncillaryItemRow, RequisitionLineRow};
use std::collections::{HashMap, HashSet};

/// Max number of edges we'll follow when chasing ancillary chains. Matches the
/// cap enforced on insert so this is defensive — real chains can't exceed it.
const MAX_ANCILLARY_DEPTH: u32 = 5;
/// Two required quantities closer than this are considered equal. Floating
/// point arithmetic through the `ancillary_qty / item_qty` ratio can introduce
/// drift even when everything cancels algebraically.
const EPSILON: f64 = 1e-6;

/// Whether a requisition has missing or stale ancillary lines.
///
/// Priority: `NeedsAdd` > `NeedsUpdate`. Once the user adds the missing lines
/// any remaining stale lines then surface as a separate update prompt.
#[derive(Debug, Clone, PartialEq)]
pub enum AncillaryState {
    None,
    /// At least one ancillary item is required but not present as a line.
    NeedsAdd { count: u32 },
    /// All required ancillaries are present but some have outdated quantities.
    NeedsUpdate { count: u32 },
}

/// A single ancillary item that either needs adding or updating.
#[derive(Debug, Clone, PartialEq)]
pub struct AncillaryDelta {
    pub item_link_id: String,
    pub required_quantity: f64,
    /// The existing requisition line for this ancillary, if any. Present for
    /// updates, absent for adds.
    pub existing_line_id: Option<String>,
}

/// Breakdown of which ancillary items need action on a given requisition.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct AncillaryPlan {
    pub to_add: Vec<AncillaryDelta>,
    pub to_update: Vec<AncillaryDelta>,
}

impl AncillaryPlan {
    pub fn state(&self) -> AncillaryState {
        if !self.to_add.is_empty() {
            AncillaryState::NeedsAdd {
                count: self.to_add.len() as u32,
            }
        } else if !self.to_update.is_empty() {
            AncillaryState::NeedsUpdate {
                count: self.to_update.len() as u32,
            }
        } else {
            AncillaryState::None
        }
    }
}

/// Given the current requisition lines and all configured ancillary links,
/// compute which ancillary items are missing or stale.
///
/// `lines` should be every line on the requisition (already filtered by
/// requisition_id by the caller). `ancillary_rows` should be every
/// non-deleted `ancillary_item` row — we build a full graph once and walk
/// only the nodes we actually start from.
pub fn compute_ancillary_plan(
    lines: &[RequisitionLineRow],
    ancillary_rows: &[AncillaryItemRow],
) -> AncillaryPlan {
    // Build adjacency: item_link_id -> list of (ancillary_item_link_id, ratio)
    //
    // Ratio here is "ancillary units per principal unit" — i.e. for every unit
    // of the principal item, we need this many units of the ancillary item.
    let mut graph: HashMap<&str, Vec<(&str, f64)>> = HashMap::new();
    for row in ancillary_rows {
        if row.item_quantity <= 0.0 {
            continue;
        }
        let ratio = row.ancillary_quantity / row.item_quantity;
        graph
            .entry(&row.item_link_id)
            .or_default()
            .push((&row.ancillary_item_link_id, ratio));
    }

    // A line's item is "top-level" if it is not transitively reachable from any
    // other line's item. Walking from every line would double-count: after the
    // first Add the ancillary items themselves become lines, and if we walked
    // from them too they'd add to demand again via the chain.
    let line_items: HashSet<&str> = lines.iter().map(|l| l.item_link_id.as_str()).collect();
    let mut dependent_items: HashSet<&str> = HashSet::new();
    for line in lines {
        let mut visited: HashSet<&str> = HashSet::new();
        collect_reachable_line_items(
            &line.item_link_id,
            &graph,
            &line_items,
            &mut dependent_items,
            &mut visited,
            0,
        );
    }

    // Walk from each top-level line to accumulate required quantities for every
    // ancillary item down its chain.
    let mut required: HashMap<String, f64> = HashMap::new();
    for line in lines {
        if dependent_items.contains(line.item_link_id.as_str()) {
            continue;
        }
        let mut visited: HashSet<&str> = HashSet::new();
        chase(
            &line.item_link_id,
            line.requested_quantity,
            &graph,
            &mut required,
            &mut visited,
            0,
        );
    }

    // Group existing lines by item_link_id so we can tell if the ancillary
    // already has a line — and compare its quantity to what's required.
    let mut existing: HashMap<&str, &RequisitionLineRow> = HashMap::new();
    for line in lines {
        existing.insert(&line.item_link_id, line);
    }

    let mut plan = AncillaryPlan::default();
    for (item_link_id, required_quantity) in required {
        match existing.get(item_link_id.as_str()) {
            None => plan.to_add.push(AncillaryDelta {
                item_link_id,
                required_quantity,
                existing_line_id: None,
            }),
            Some(line) => {
                if (line.requested_quantity - required_quantity).abs() > EPSILON {
                    plan.to_update.push(AncillaryDelta {
                        item_link_id,
                        required_quantity,
                        existing_line_id: Some(line.id.clone()),
                    });
                }
            }
        }
    }

    // Stable ordering for deterministic results
    plan.to_add.sort_by(|a, b| a.item_link_id.cmp(&b.item_link_id));
    plan.to_update
        .sort_by(|a, b| a.item_link_id.cmp(&b.item_link_id));

    plan
}

/// Walks the chain starting at `from` and flags any line items reachable via
/// the graph as `dependent` — i.e. they're downstream of another line and
/// shouldn't be treated as independent demand.
fn collect_reachable_line_items<'a>(
    from: &'a str,
    graph: &'a HashMap<&'a str, Vec<(&'a str, f64)>>,
    line_items: &HashSet<&str>,
    dependent: &mut HashSet<&'a str>,
    visited: &mut HashSet<&'a str>,
    depth: u32,
) {
    if depth >= MAX_ANCILLARY_DEPTH {
        return;
    }
    if !visited.insert(from) {
        return;
    }
    if let Some(children) = graph.get(from) {
        for (child, _) in children {
            if line_items.contains(child) {
                dependent.insert(child);
            }
            collect_reachable_line_items(child, graph, line_items, dependent, visited, depth + 1);
        }
    }
    visited.remove(from);
}

fn chase<'a>(
    current: &'a str,
    quantity: f64,
    graph: &'a HashMap<&'a str, Vec<(&'a str, f64)>>,
    required: &mut HashMap<String, f64>,
    visited: &mut HashSet<&'a str>,
    depth: u32,
) {
    if depth >= MAX_ANCILLARY_DEPTH {
        return;
    }
    if !visited.insert(current) {
        // Cycle (the cycle detector at upsert time should prevent this, but
        // we're belt-and-suspenders since we rely on it to terminate).
        return;
    }

    if let Some(children) = graph.get(current) {
        for (child, ratio) in children {
            let child_qty = quantity * ratio;
            *required.entry((*child).to_string()).or_default() += child_qty;
            chase(child, child_qty, graph, required, visited, depth + 1);
        }
    }

    visited.remove(current);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(id: &str, item: &str, qty: f64) -> RequisitionLineRow {
        RequisitionLineRow {
            id: id.to_string(),
            item_link_id: item.to_string(),
            requested_quantity: qty,
            ..Default::default()
        }
    }

    fn link(principal: &str, ancillary: &str, i: f64, a: f64) -> AncillaryItemRow {
        AncillaryItemRow {
            id: format!("{principal}->{ancillary}"),
            item_link_id: principal.to_string(),
            ancillary_item_link_id: ancillary.to_string(),
            item_quantity: i,
            ancillary_quantity: a,
            deleted_datetime: None,
        }
    }

    #[test]
    fn no_ancillary_links_is_none() {
        let plan = compute_ancillary_plan(&[line("l1", "vaccine", 100.0)], &[]);
        assert_eq!(plan.state(), AncillaryState::None);
    }

    #[test]
    fn missing_ancillary_surfaces_as_needs_add() {
        // 100 vaccines → need 1 safety box (100:1)
        let plan = compute_ancillary_plan(
            &[line("l1", "vaccine", 100.0)],
            &[link("vaccine", "safety_box", 100.0, 1.0)],
        );
        assert_eq!(plan.state(), AncillaryState::NeedsAdd { count: 1 });
        assert_eq!(plan.to_add.len(), 1);
        let delta = &plan.to_add[0];
        assert_eq!(delta.item_link_id, "safety_box");
        assert!((delta.required_quantity - 1.0).abs() < EPSILON);
    }

    #[test]
    fn existing_line_with_correct_quantity_is_none() {
        let plan = compute_ancillary_plan(
            &[
                line("l1", "vaccine", 100.0),
                line("l2", "safety_box", 1.0),
            ],
            &[link("vaccine", "safety_box", 100.0, 1.0)],
        );
        assert_eq!(plan.state(), AncillaryState::None);
    }

    #[test]
    fn existing_line_with_wrong_quantity_surfaces_as_needs_update() {
        let plan = compute_ancillary_plan(
            &[
                line("l1", "vaccine", 100.0),
                line("l2", "safety_box", 0.5), // stale
            ],
            &[link("vaccine", "safety_box", 100.0, 1.0)],
        );
        assert_eq!(plan.state(), AncillaryState::NeedsUpdate { count: 1 });
        assert_eq!(plan.to_update.len(), 1);
        let delta = &plan.to_update[0];
        assert_eq!(delta.item_link_id, "safety_box");
        assert_eq!(delta.existing_line_id.as_deref(), Some("l2"));
        assert!((delta.required_quantity - 1.0).abs() < EPSILON);
    }

    #[test]
    fn wastage_non_integer_ratio() {
        // 1 vaccine → 1.1 syringe (10% wastage) for 50 vaccines → 55 syringes
        let plan = compute_ancillary_plan(
            &[line("l1", "vaccine", 50.0)],
            &[link("vaccine", "syringe", 1.0, 1.1)],
        );
        assert_eq!(plan.to_add.len(), 1);
        assert!((plan.to_add[0].required_quantity - 55.0).abs() < EPSILON);
    }

    #[test]
    fn chain_cascades_through_multiple_levels() {
        // vaccine -> syringe -> safety_box
        // 100 vaccines, each vaccine needs 1.1 syringes (110 syringes),
        // each 100 syringes need 1 safety_box (1.1 safety_boxes)
        let plan = compute_ancillary_plan(
            &[line("l1", "vaccine", 100.0)],
            &[
                link("vaccine", "syringe", 1.0, 1.1),
                link("syringe", "safety_box", 100.0, 1.0),
            ],
        );
        assert_eq!(plan.to_add.len(), 2);
        let syringe = plan
            .to_add
            .iter()
            .find(|d| d.item_link_id == "syringe")
            .unwrap();
        let safety_box = plan
            .to_add
            .iter()
            .find(|d| d.item_link_id == "safety_box")
            .unwrap();
        assert!((syringe.required_quantity - 110.0).abs() < EPSILON);
        assert!((safety_box.required_quantity - 1.1).abs() < EPSILON);
    }

    #[test]
    fn multiple_principals_for_same_ancillary_sum() {
        // Two vaccine lines both needing safety boxes
        let plan = compute_ancillary_plan(
            &[line("l1", "vaccine_a", 100.0), line("l2", "vaccine_b", 50.0)],
            &[
                link("vaccine_a", "safety_box", 100.0, 1.0),
                link("vaccine_b", "safety_box", 100.0, 1.0),
            ],
        );
        assert_eq!(plan.to_add.len(), 1);
        assert!((plan.to_add[0].required_quantity - 1.5).abs() < EPSILON);
    }

    #[test]
    fn needs_add_takes_priority_over_needs_update() {
        // Syringe is missing (needs add), safety_box is stale (needs update).
        // State should report NeedsAdd — update surfaces after add is done.
        let plan = compute_ancillary_plan(
            &[
                line("l1", "vaccine", 100.0),
                line("l2", "safety_box", 999.0), // stale
                // missing: syringe
            ],
            &[
                link("vaccine", "syringe", 1.0, 1.0),
                link("vaccine", "safety_box", 100.0, 1.0),
            ],
        );
        assert_eq!(plan.state(), AncillaryState::NeedsAdd { count: 1 });
        assert_eq!(plan.to_add.len(), 1);
        assert_eq!(plan.to_update.len(), 1); // still reported separately on the plan
    }

    #[test]
    fn ignores_deleted_ancillary_rows_if_caller_filters() {
        // This function doesn't filter deleted rows — callers are expected to
        // pass only the live rows (matching how AncillaryItemRepository queries).
        // But the computation itself just looks at what it's given, proving no
        // hidden dependency on deleted_datetime.
        let mut row = link("vaccine", "safety_box", 100.0, 1.0);
        row.deleted_datetime = Some(chrono::NaiveDateTime::default());
        let plan = compute_ancillary_plan(&[line("l1", "vaccine", 100.0)], &[row]);
        // The row is present, so the caller DID include a deleted row — we'd
        // compute against it. This is the caller's responsibility to filter.
        assert_eq!(plan.state(), AncillaryState::NeedsAdd { count: 1 });
    }

    #[test]
    fn chain_all_lines_present_is_stable() {
        // After the first Add, every ancillary in the chain is also a line.
        // Walking from each of them would double-count — each child in the chain
        // would accumulate contributions from every ancestor line as well as
        // from the graph walks starting from the intermediate lines themselves.
        // Only vaccine should be treated as a principal here.
        let plan = compute_ancillary_plan(
            &[
                line("l1", "vaccine", 100.0),
                line("l2", "syringe", 100.0),
                line("l3", "safety_box", 1.0),
            ],
            &[
                link("vaccine", "syringe", 1.0, 1.0),
                link("syringe", "safety_box", 100.0, 1.0),
            ],
        );
        assert_eq!(plan.state(), AncillaryState::None);
    }

    #[test]
    fn edit_principal_propagates_in_one_update() {
        // User had a stable requisition (vaccine=100, syringe=100, safety_box=1)
        // and then bumped vaccine to 200. Both syringe and safety_box should now
        // be flagged stale in the same plan so one Update click fixes both.
        let plan = compute_ancillary_plan(
            &[
                line("l1", "vaccine", 200.0),
                line("l2", "syringe", 100.0),
                line("l3", "safety_box", 1.0),
            ],
            &[
                link("vaccine", "syringe", 1.0, 1.0),
                link("syringe", "safety_box", 100.0, 1.0),
            ],
        );
        assert_eq!(plan.state(), AncillaryState::NeedsUpdate { count: 2 });
        // Required: syringe = 200, safety_box = 200 * 1/100 = 2
        let syringe = plan
            .to_update
            .iter()
            .find(|d| d.item_link_id == "syringe")
            .unwrap();
        let safety_box = plan
            .to_update
            .iter()
            .find(|d| d.item_link_id == "safety_box")
            .unwrap();
        assert!((syringe.required_quantity - 200.0).abs() < EPSILON);
        assert!((safety_box.required_quantity - 2.0).abs() < EPSILON);
    }

    #[test]
    fn respects_max_depth_defensively() {
        // A chain longer than MAX_ANCILLARY_DEPTH — simulating data that
        // somehow bypassed the upsert-time check. The walk stops and doesn't
        // blow up.
        let plan = compute_ancillary_plan(
            &[line("l1", "a", 1.0)],
            &[
                link("a", "b", 1.0, 1.0),
                link("b", "c", 1.0, 1.0),
                link("c", "d", 1.0, 1.0),
                link("d", "e", 1.0, 1.0),
                link("e", "f", 1.0, 1.0),
                link("f", "g", 1.0, 1.0), // would be depth 6 — skipped
            ],
        );
        let item_ids: Vec<&str> = plan.to_add.iter().map(|d| d.item_link_id.as_str()).collect();
        assert!(item_ids.contains(&"e"));
        assert!(!item_ids.contains(&"g"));
    }
}
