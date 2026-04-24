use crate::ChangelogTableName;

/// Tables in FK dependency order. The integration loop processes each
/// table's sync_buffer rows before moving to the next, so FK parents
/// are always integrated before their children.
pub const INTEGRATION_ORDER: &[ChangelogTableName] = &[
    ChangelogTableName::Site,
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
    use crate::{mock::MockDataInserts, test_db::setup_all, StorageConnection};
    use diesel::prelude::*;
    use std::collections::{HashMap, HashSet, VecDeque};
    use strum::IntoEnumIterator;
    use topological_sort::TopologicalSort;

    // ---- Report type and checker under test ----

    #[derive(QueryableByName, Debug, Clone)]
    struct FkRow {
        #[diesel(sql_type = diesel::sql_types::Text)]
        child_table: String,
        #[diesel(sql_type = diesel::sql_types::Text)]
        parent_table: String,
    }

    #[derive(Debug, Default, PartialEq, Eq)]
    struct IntegrationOrderReport {
        /// Tables that appear more than once in `tables_in_order`. Sorted.
        duplicates: Vec<String>,
        /// Tables in `all_tables` that are not covered by `tables_in_order`
        /// or `skipped`. Sorted.
        missing: Vec<String>,
        /// (child, parent) pairs where `child` appears at or before `parent`
        /// in `tables_in_order`. Sorted.
        fk_violations: Vec<(String, String)>,
        /// Topologically sorted order (FK parents before children). Only
        /// populated when `fk_violations` is non-empty.
        suggested_order: Vec<String>,
    }

    impl IntegrationOrderReport {
        fn is_ok(&self) -> bool {
            self.duplicates.is_empty() && self.missing.is_empty() && self.fk_violations.is_empty()
        }
    }

    /// Validates `tables_in_order` against three rules:
    /// 1. No duplicates within `tables_in_order`.
    /// 2. Every `all_tables` entry is in `tables_in_order` or `skipped`.
    /// 3. `tables_in_order` respects every FK constraint in the `public`
    ///    schema, traversing through non-listed intermediates (e.g. `_link`
    ///    tables) so `invoice_line -> item_link -> item` is treated as
    ///    `invoice_line` depending on `item`.
    fn check_integration_order(
        connection: &StorageConnection,
        tables_in_order: &[&str],
        all_tables: &[&str],
        skipped: &[&str],
    ) -> IntegrationOrderReport {
        let mut report = IntegrationOrderReport::default();

        // (1) Duplicates.
        let mut seen: HashSet<&str> = HashSet::new();
        for t in tables_in_order {
            if !seen.insert(t) {
                report.duplicates.push(t.to_string());
            }
        }
        report.duplicates.sort();
        report.duplicates.dedup();

        // (2) Missing.
        let covered: HashSet<&str> = tables_in_order
            .iter()
            .chain(skipped.iter())
            .copied()
            .collect();
        for t in all_tables {
            if !covered.contains(t) {
                report.missing.push(t.to_string());
            }
        }
        report.missing.sort();

        // (3) FK ordering.
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

        let in_order_set: HashSet<String> = tables_in_order.iter().map(|t| t.to_string()).collect();

        // BFS from each listed table, hopping through non-listed intermediates
        // to find transitive listed-table parents.
        let mut deps: Vec<(String, String)> = Vec::new();
        for child in &in_order_set {
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
                    if in_order_set.contains(parent) {
                        deps.push((child.clone(), parent.clone()));
                    } else {
                        queue.push_back(parent.clone());
                    }
                }
            }
        }

        let position: HashMap<String, usize> = tables_in_order
            .iter()
            .enumerate()
            .map(|(i, t)| (t.to_string(), i))
            .collect();

        report.fk_violations = deps
            .iter()
            .filter(|(child, parent)| position[parent] >= position[child])
            .cloned()
            .collect();
        report.fk_violations.sort();

        if report.fk_violations.is_empty() {
            return report;
        }

        let mut ts = TopologicalSort::<String>::new();
        for table in &in_order_set {
            ts.insert(table.clone());
        }
        for (child, parent) in &deps {
            ts.add_dependency(parent.clone(), child.clone());
        }
        loop {
            let mut next = ts.pop_all();
            if next.is_empty() {
                assert!(ts.is_empty(), "FK graph has a cycle");
                break;
            }
            next.sort();
            report.suggested_order.extend(next);
        }

        report
    }

    // ---- Main test ----

    /// Verifies INTEGRATION_ORDER is up to date with the schema: every
    /// variant is accounted for (here or in NOT_YET_IN_V7) and the order
    /// respects every FK constraint. On failure, prints a suggested order.
    #[actix_rt::test]
    async fn integration_order_is_up_to_date() {
        let (_, connection, _, _) =
            setup_all("test_sync_v7_integration_order", MockDataInserts::none()).await;

        let in_order: Vec<String> = INTEGRATION_ORDER.iter().map(|t| t.to_string()).collect();
        let all_tables: Vec<String> = ChangelogTableName::iter().map(|t| t.to_string()).collect();
        let skipped: Vec<String> = NOT_YET_IN_V7.iter().map(|t| t.to_string()).collect();

        let in_order_refs: Vec<&str> = in_order.iter().map(String::as_str).collect();
        let all_refs: Vec<&str> = all_tables.iter().map(String::as_str).collect();
        let skipped_refs: Vec<&str> = skipped.iter().map(String::as_str).collect();
        let report = check_integration_order(&connection, &in_order_refs, &all_refs, &skipped_refs);
        if report.is_ok() {
            return;
        }

        let mut msg = String::new();
        if !report.duplicates.is_empty() {
            msg.push_str(&format!(
                "\nDuplicate entries in INTEGRATION_ORDER: {:?}",
                report.duplicates,
            ));
        }
        if !report.missing.is_empty() {
            msg.push_str(&format!(
                "\nChangelogTableName variants missing from INTEGRATION_ORDER: {:?}",
                report.missing,
            ));
        }
        if !report.fk_violations.is_empty() {
            msg.push_str("\nINTEGRATION_ORDER violates FK constraints:");
            for (c, p) in &report.fk_violations {
                msg.push_str(&format!("\n  - {c} depends on {p} (but appears before it)"));
            }
            msg.push_str("\n\nSuggested order:");
            for t in &report.suggested_order {
                msg.push_str(&format!(
                    "\n    ChangelogTableName::{},",
                    snake_to_pascal(t)
                ));
            }
        }
        panic!("{}", msg);
    }

    // ---- Shared meta-test setup ----

    /// Creates a fresh test DB and builds the FK chain used by every
    /// meta-test (arrows are FK references):
    ///
    ///     _child_ -> _middle_ -> _parent_
    ///
    /// `_later_` and `_forgotten_` appear in the tests as
    /// string-only names (they never hit the DB) to exercise the
    /// completeness check.
    async fn setup_meta_schema(db_name: &str) -> StorageConnection {
        let (_, connection, _, _) = setup_all(db_name, MockDataInserts::none()).await;

        let ddl = [
            "CREATE TABLE _parent_ (id TEXT PRIMARY KEY)",
            "CREATE TABLE _middle_ (
                id        TEXT PRIMARY KEY,
                parent_id TEXT REFERENCES _parent_(id)
             )",
            "CREATE TABLE _child_ (
                id        TEXT PRIMARY KEY,
                middle_id TEXT REFERENCES _middle_(id)
             )",
        ];
        for stmt in ddl {
            diesel::sql_query(stmt)
                .execute(connection.lock().connection())
                .expect("failed to create meta-test tables");
        }
        connection
    }

    // ---- Meta-tests: check_integration_order correctness ----

    #[actix_rt::test]
    async fn check_integration_order_accepts_valid_input() {
        let connection = setup_meta_schema("test_sync_v7_meta_valid").await;

        let report = check_integration_order(
            &connection,
            &["_parent_", "_middle_", "_child_"],
            &["_parent_", "_middle_", "_child_", "_later_", "_forgotten_"],
            &["_later_", "_forgotten_"],
        );

        assert!(report.is_ok(), "expected ok report, got {:?}", report);
    }

    #[actix_rt::test]
    async fn check_integration_order_detects_missing_tables() {
        let connection = setup_meta_schema("test_sync_v7_meta_missing").await;

        let report = check_integration_order(
            &connection,
            &["_parent_", "_middle_", "_child_"],
            &["_parent_", "_middle_", "_child_", "_later_", "_forgotten_"],
            &["_later_"], // _forgotten_ intentionally omitted
        );

        assert_eq!(report.missing, ["_forgotten_"]);
        assert_eq!(report.duplicates.len(), 0);
        assert_eq!(report.fk_violations.len(), 0);
    }

    #[actix_rt::test]
    async fn check_integration_order_detects_duplicates() {
        let connection = setup_meta_schema("test_sync_v7_meta_duplicates").await;

        let report = check_integration_order(
            &connection,
            &["_parent_", "_middle_", "_middle_", "_child_"],
            &["_parent_", "_middle_", "_child_", "_later_", "_forgotten_"],
            &["_later_", "_forgotten_"],
        );

        assert_eq!(report.duplicates, ["_middle_"]);
        assert_eq!(report.missing.len(), 0);
        assert_eq!(report.fk_violations.len(), 0);
    }

    #[actix_rt::test]
    async fn check_integration_order_detects_fk_violations() {
        let connection = setup_meta_schema("test_sync_v7_meta_fk").await;

        // Fully reversed: both FKs violated.
        let report = check_integration_order(
            &connection,
            &["_child_", "_middle_", "_parent_"],
            &["_parent_", "_middle_", "_child_", "_later_", "_forgotten_"],
            &["_later_", "_forgotten_"],
        );
        assert_eq!(
            report.fk_violations,
            [
                ("_child_".to_string(), "_middle_".to_string()),
                ("_middle_".to_string(), "_parent_".to_string()),
            ],
        );
        assert_eq!(report.suggested_order, ["_parent_", "_middle_", "_child_"],);

        // Only _middle_ misplaced (appears after its child).
        let report = check_integration_order(
            &connection,
            &["_parent_", "_child_", "_middle_"],
            &["_parent_", "_middle_", "_child_", "_later_", "_forgotten_"],
            &["_later_", "_forgotten_"],
        );
        assert_eq!(
            report.fk_violations,
            [("_child_".to_string(), "_middle_".to_string())],
        );
    }

    #[actix_rt::test]
    async fn check_integration_order_reports_all_failures_at_once() {
        let connection = setup_meta_schema("test_sync_v7_meta_all_failures").await;

        let report = check_integration_order(
            &connection,
            // _middle_ duplicated + order fully reversed
            &["_child_", "_middle_", "_middle_", "_parent_"],
            &["_parent_", "_middle_", "_child_", "_later_", "_forgotten_"],
            &[], // nothing skipped -> _later_ + _forgotten_ both missing
        );

        assert_eq!(report.duplicates, ["_middle_"]);
        assert_eq!(report.missing, ["_forgotten_", "_later_"]);
        assert_eq!(
            report.fk_violations,
            [
                ("_child_".to_string(), "_middle_".to_string()),
                ("_middle_".to_string(), "_parent_".to_string()),
            ],
        );
    }

    // ---- Misc ----

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
