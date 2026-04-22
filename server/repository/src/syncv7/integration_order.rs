use crate::ChangelogTableName;

/// Tables in FK dependency order. The integration loop processes each
/// table's sync_buffer rows before moving to the next, so FK parents
/// are always integrated before their children.
pub const INTEGRATION_ORDER: &[ChangelogTableName] = &[
    ChangelogTableName::Unit,
    ChangelogTableName::Currency,
    ChangelogTableName::Name,
    ChangelogTableName::LocationType,
    ChangelogTableName::Item,
    ChangelogTableName::Store,
    ChangelogTableName::StockLine,
    ChangelogTableName::Invoice,
    ChangelogTableName::InvoiceLine,
];

/// Variants not yet wired up to v7. Move each into `INTEGRATION_ORDER`
/// as its translator is implemented. Delete this const (and the related
/// checks in the test) once empty.
pub const NOT_YET_IN_V7: &[ChangelogTableName] = &[
    ChangelogTableName::BackendPlugin,
    ChangelogTableName::Number,
    ChangelogTableName::Location,
    ChangelogTableName::LocationMovement,
    ChangelogTableName::Stocktake,
    ChangelogTableName::StocktakeLine,
    ChangelogTableName::Requisition,
    ChangelogTableName::RequisitionLine,
    ChangelogTableName::ActivityLog,
    ChangelogTableName::Barcode,
    ChangelogTableName::Clinician,
    ChangelogTableName::ClinicianStoreJoin,
    ChangelogTableName::NameStoreJoin,
    ChangelogTableName::Document,
    ChangelogTableName::Sensor,
    ChangelogTableName::TemperatureBreach,
    ChangelogTableName::TemperatureBreachConfig,
    ChangelogTableName::TemperatureLog,
    ChangelogTableName::PackVariant,
    ChangelogTableName::AssetClass,
    ChangelogTableName::AssetCategory,
    ChangelogTableName::AssetCatalogueType,
    ChangelogTableName::AssetCatalogueItem,
    ChangelogTableName::AssetCatalogueItemProperty,
    ChangelogTableName::AssetCatalogueProperty,
    ChangelogTableName::AssetInternalLocation,
    ChangelogTableName::SyncFileReference,
    ChangelogTableName::Asset,
    ChangelogTableName::AssetLog,
    ChangelogTableName::AssetLogReason,
    ChangelogTableName::AssetProperty,
    ChangelogTableName::Property,
    ChangelogTableName::NameProperty,
    ChangelogTableName::NameOmsFields,
    ChangelogTableName::RnrForm,
    ChangelogTableName::RnrFormLine,
    ChangelogTableName::Demographic,
    ChangelogTableName::VaccineCourse,
    ChangelogTableName::VaccineCourseItem,
    ChangelogTableName::VaccineCourseDose,
    ChangelogTableName::VaccineCourseStoreConfig,
    ChangelogTableName::Vaccination,
    ChangelogTableName::Encounter,
    ChangelogTableName::ItemVariant,
    ChangelogTableName::PackagingVariant,
    ChangelogTableName::IndicatorValue,
    ChangelogTableName::BundledItem,
    ChangelogTableName::ContactForm,
    ChangelogTableName::SystemLog,
    ChangelogTableName::InsuranceProvider,
    ChangelogTableName::FrontendPlugin,
    ChangelogTableName::NameInsuranceJoin,
    ChangelogTableName::Report,
    ChangelogTableName::FormSchema,
    ChangelogTableName::PluginData,
    ChangelogTableName::Preference,
    ChangelogTableName::VVMStatusLog,
    ChangelogTableName::Campaign,
    ChangelogTableName::SyncMessage,
    ChangelogTableName::PurchaseOrder,
    ChangelogTableName::PurchaseOrderLine,
    ChangelogTableName::MasterList,
];

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all};
    use diesel::prelude::*;
    use std::collections::{HashMap, HashSet, VecDeque};
    use strum::IntoEnumIterator;
    use topological_sort::TopologicalSort;

    #[derive(QueryableByName, Debug, Clone)]
    struct FkRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        child_table: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        parent_table: String,
    }

    /// Verifies INTEGRATION_ORDER is up to date with the schema: every
    /// variant is accounted for (here or in NOT_YET_IN_V7) and the order
    /// respects every FK constraint. On failure, prints a suggested order.
    #[actix_rt::test]
    async fn integration_order_is_up_to_date() {
        // Completeness check.
        let in_order: HashSet<String> = INTEGRATION_ORDER.iter().map(|t| t.to_string()).collect();
        let all: HashSet<String> = ChangelogTableName::iter().map(|t| t.to_string()).collect();

        let mut seen: HashSet<String> = HashSet::new();
        let mut duplicates: Vec<String> = Vec::new();
        for table in INTEGRATION_ORDER {
            let name = table.to_string();
            if !seen.insert(name.clone()) {
                duplicates.push(name);
            }
        }
        assert!(
            duplicates.is_empty(),
            "Duplicate entries in INTEGRATION_ORDER: {:?}",
            duplicates,
        );

        // TODO: remove NOT_YET_IN_V7 handling once the list is empty.
        // Remove variables 'skipped, 'covered' and 'missing' -> use the commented out 'missing' at this stage
        let skipped: HashSet<String> = NOT_YET_IN_V7.iter().map(|t| t.to_string()).collect();
        let covered: HashSet<String> = in_order.union(&skipped).cloned().collect();
        let missing: Vec<&String> = all.difference(&covered).collect();
        // let missing: Vec<&String> = all.difference(&in_order).collect();
        assert!(
            missing.is_empty(),
            "ChangelogTableName variants missing from INTEGRATION_ORDER: {:?}",
            missing,
        );

        // FK ordering check.
        let (_, connection, _, _) =
            setup_all("test_sync_v7_integration_order", MockDataInserts::none()).await;

        let fk_query = r#"
            SELECT DISTINCT
                tc.table_name   AS child_table,
                ccu.table_name  AS parent_table
            FROM information_schema.table_constraints  tc
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema    = ccu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema    = 'public'
              AND tc.table_name     <> ccu.table_name
        "#;

        let all_fks: Vec<FkRow> = diesel::sql_query(fk_query)
            .load(connection.lock().connection())
            .expect("failed to query information_schema for FK constraints");

        let mut parents_of: HashMap<String, Vec<String>> = HashMap::new();
        for fk in &all_fks {
            parents_of
                .entry(fk.child_table.clone())
                .or_default()
                .push(fk.parent_table.clone());
        }

        // BFS through FKs from each sync table, traversing through non-sync
        // intermediates (e.g. `_link` tables) to find transitive sync-table parents.
        let mut sync_deps: Vec<(String, String)> = Vec::new();
        for child in &in_order {
            let mut queue: VecDeque<String> = VecDeque::new();
            let mut visited: HashSet<String> = HashSet::new();
            queue.push_back(child.clone());
            visited.insert(child.clone());

            while let Some(current) = queue.pop_front() {
                let Some(parents) = parents_of.get(&current) else {
                    continue;
                };
                for parent in parents {
                    if !visited.insert(parent.clone()) {
                        continue;
                    }
                    if in_order.contains(parent) {
                        sync_deps.push((child.clone(), parent.clone()));
                    } else {
                        queue.push_back(parent.clone());
                    }
                }
            }
        }

        let position: HashMap<String, usize> = INTEGRATION_ORDER
            .iter()
            .enumerate()
            .map(|(i, t)| (t.to_string(), i))
            .collect();

        let violations: Vec<(String, String)> = sync_deps
            .iter()
            .filter(|(child, parent)| position[parent] >= position[child])
            .cloned()
            .collect();

        // Early return on the happy path so the topological sort below
        // only runs when we actually need the suggested-order message —
        // assert! would eagerly evaluate its format args on every run.
        if violations.is_empty() {
            return;
        }

        // Topologically sort for the suggested-order failure message.
        let mut ts = TopologicalSort::<String>::new();
        for table in &in_order {
            ts.insert(table.clone());
        }
        for (child, parent) in &sync_deps {
            ts.add_dependency(parent.clone(), child.clone());
        }

        let mut suggested: Vec<String> = Vec::new();
        loop {
            let mut next = ts.pop_all();
            if next.is_empty() {
                assert!(ts.is_empty(), "FK graph has a cycle");
                break;
            }
            next.sort();
            suggested.extend(next);
        }

        let violations_str = violations
            .iter()
            .map(|(c, p)| format!("  - {c} depends on {p} (but appears before it)"))
            .collect::<Vec<_>>()
            .join("\n");

        let suggested_str = suggested
            .iter()
            .map(|t| format!("    ChangelogTableName::{},", snake_to_pascal(t)))
            .collect::<Vec<_>>()
            .join("\n");

        panic!(
            "INTEGRATION_ORDER violates FK constraints:\n{}\n\nSuggested order:\n{}",
            violations_str, suggested_str,
        );
    }

    fn snake_to_pascal(s: &str) -> String {
        s.split('_')
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    Some(c) => c.to_uppercase().chain(chars).collect::<String>(),
                    None => String::new(),
                }
            })
            .collect()
    }
}
