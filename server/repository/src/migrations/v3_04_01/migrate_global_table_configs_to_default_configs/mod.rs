use crate::migrations::*;
use diesel::prelude::*;

mod convert;

// Declared here rather than taken from `db_diesel::preference_row`: a fragment
// is frozen once shipped, so it mustn't depend on a row type that can change.
table! {
    preference (id) {
        id -> Text,
        key -> Text,
        value -> Text,
        store_id -> Nullable<Text>,
    }
}

const OLD_KEY: &str = "global_table_configs";
const NEW_KEY: &str = "global_table_default_configs";
/// `upsert_global`'s id for a global preference: `<key>_global`.
const NEW_ID: &str = "global_table_default_configs_global";

const MAP_JSON: &str = include_str!("legacy_table_config_map.json");

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "migrate_global_table_configs_to_default_configs"
    }

    /// Converts the shared table layouts set up in the React front end
    /// (`global_table_configs`) into the Solid front end's own preference,
    /// `global_table_default_configs` (#2072). The two front ends use
    /// different table ids, column ids and layout shapes, so the Solid front
    /// end keeps its layouts in a preference of its own, and this fragment
    /// gives it the React front end's layouts to start from. The conversion
    /// and its rules are in `convert.rs`; the table and column ids in
    /// `legacy_table_config_map.json`.
    ///
    /// `global_table_configs` is left as it is: the React front end still
    /// reads it.
    ///
    /// Nothing is written if `global_table_default_configs` already exists. A
    /// remote still on an older version stores the central server's row like
    /// any other preference, so a remote that upgrades after the central server
    /// can already hold layouts an admin saved in the Solid front end. Writing
    /// its own conversion over them would lose them until they next changed,
    /// since the central server's changelog has already moved past that row.
    ///
    /// Every server runs this. A remote's `global_table_configs` is the central
    /// server's, so it converts to the same result, and the central server's
    /// row replaces it on the next sync anyway (same id). The changelog row is
    /// stamped with the central server's site id, falling back to 0 (the
    /// OMS-central convention), as `prescription_request_occupation_prominent`
    /// does: on the central server it is distributed as its own row, and on a
    /// remote the push filter, which sends only rows authored on the pushing
    /// site, keeps it local.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let new_exists = diesel::select(diesel::dsl::exists(
            preference::table
                .filter(preference::key.eq(NEW_KEY))
                .filter(preference::store_id.is_null()),
        ))
        .get_result::<bool>(connection.lock().connection())?;
        if new_exists {
            return Ok(());
        }

        let old_value = preference::table
            .filter(preference::key.eq(OLD_KEY))
            .filter(preference::store_id.is_null())
            .select(preference::value)
            .first::<String>(connection.lock().connection())
            .optional()?;
        let Some(old_value) = old_value else {
            return Ok(());
        };
        // A value that isn't a JSON object can't be one the React front end
        // wrote, and holds nothing to convert.
        let Ok(serde_json::Value::Object(old)) = serde_json::from_str(&old_value) else {
            return Ok(());
        };

        let map = convert::parse_map(MAP_JSON)?;
        let new = convert::convert_global_table_configs(&old, &map);
        if new.is_empty() {
            return Ok(());
        }

        diesel::insert_into(preference::table)
            .values((
                preference::id.eq(NEW_ID),
                preference::key.eq(NEW_KEY),
                preference::value.eq(serde_json::Value::Object(new).to_string()),
                preference::store_id.eq(None::<String>),
            ))
            .execute(connection.lock().connection())?;

        sql!(
            connection,
            r#"
            INSERT INTO changelog (table_name, record_id, row_action, source_site_id)
            VALUES ('preference', '{NEW_ID}', 'UPSERT',
                COALESCE(
                    (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID'),
                    0
                ));
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::convert::{self, LegacyTableConfigMap};
    use super::*;
    use crate::migrations::{v3_04_00::V3_04_00, v3_04_01::V3_04_01};
    use crate::test_db::*;
    use serde_json::{Map, Value, json};

    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            row_action -> Text,
            store_id -> Nullable<Text>,
            source_site_id -> Nullable<Integer>,
        }
    }

    const FIXTURES_JSON: &str = include_str!("conversion_fixtures.json");

    fn object(value: Value) -> Map<String, Value> {
        match value {
            Value::Object(object) => object,
            other => panic!("expected an object, got {other}"),
        }
    }

    fn fixture_map() -> LegacyTableConfigMap {
        let fixtures: Value = serde_json::from_str(FIXTURES_JSON).unwrap();
        serde_json::from_value(fixtures["map"].clone()).unwrap()
    }

    #[test]
    fn conversion_fixtures() {
        let fixtures: Value = serde_json::from_str(FIXTURES_JSON).unwrap();
        let map = fixture_map();
        let cases = fixtures["cases"].as_array().unwrap();
        assert!(!cases.is_empty());
        for case in cases {
            let name = case["name"].as_str().unwrap();
            let result = convert::convert_tables(&object(case["old"].clone()), &map);
            assert_eq!(Value::Object(result), case["expected"], "{name}");
        }
    }

    #[test]
    fn real_map_parses() {
        let map = convert::parse_map(MAP_JSON).unwrap();
        assert!(!map.tables.is_empty());
        assert_eq!(
            map.column_prefixes.get("prop-").map(String::as_str),
            Some("cf-")
        );
    }

    #[test]
    fn new_shape_entries_are_copied_and_beat_converted_ones() {
        let map = fixture_map();
        // A layout saved from the Solid front end under an id it shares with
        // the React front end, kept exactly, `compact` band included.
        let saved_in_new_ui = json!({
            "base": { "columnOrder": ["batch"] },
            "compact": { "viewMode": "card" }
        });
        let old = object(json!({
            "new-list": saved_in_new_ui,
            "old-list": { "columnOrder": ["code"] },
            "old-detail": { "grouping": ["item.code"] }
        }));
        let result = convert::convert_global_table_configs(&old, &map);
        assert_eq!(
            Value::Object(result),
            json!({
                "new-list": saved_in_new_ui,
                "new-detail": { "base": { "groupRows": true } }
            })
        );
    }

    #[test]
    fn converted_entries_go_under_base_only() {
        let map = fixture_map();
        let old = object(json!({ "old-list": { "viewMode": "card" } }));
        assert_eq!(
            Value::Object(convert::convert_global_table_configs(&old, &map)),
            json!({ "new-list": { "base": { "viewMode": "card" } } })
        );
    }

    struct Fixture {
        connection: StorageConnection,
    }

    impl Fixture {
        async fn new(name: &str) -> Self {
            let SetupResult { connection, .. } = setup_test(SetupOption {
                db_name: &format!("migration_3_04_01_table_default_configs_{name}"),
                version: Some(V3_04_00.version()),
                ..Default::default()
            })
            .await;
            Fixture { connection }
        }

        fn insert_preference(&self, id: &str, key: &str, value: &str, store_id: Option<&str>) {
            diesel::insert_into(preference::table)
                .values((
                    preference::id.eq(id),
                    preference::key.eq(key),
                    preference::value.eq(value),
                    preference::store_id.eq(store_id),
                ))
                .execute(self.connection.lock().connection())
                .unwrap();
        }

        fn insert_old(&self, value: &Value) {
            self.insert_preference(
                "global_table_configs_global",
                OLD_KEY,
                &value.to_string(),
                None,
            );
        }

        fn set_central_site_id(&self, site_id: i32) {
            sql!(
                &self.connection,
                "INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', {site_id});"
            )
            .unwrap();
        }

        fn migrate(&self) {
            migrate(
                &self.connection,
                Some(V3_04_01.version()),
                MigrationConfig::default(),
            )
            .unwrap();
        }

        fn value(&self, id: &str) -> Option<String> {
            preference::table
                .filter(preference::id.eq(id))
                .select(preference::value)
                .first::<String>(self.connection.lock().connection())
                .optional()
                .unwrap()
        }

        fn new_value(&self) -> Option<Value> {
            self.value(NEW_ID)
                .map(|value| serde_json::from_str(&value).unwrap())
        }

        fn new_key(&self) -> Option<String> {
            preference::table
                .filter(preference::id.eq(NEW_ID))
                .select(preference::key)
                .first::<String>(self.connection.lock().connection())
                .optional()
                .unwrap()
        }

        fn changelog(&self) -> Vec<(String, Option<String>, Option<i32>)> {
            changelog::table
                .filter(changelog::table_name.eq("preference"))
                .filter(changelog::record_id.eq(NEW_ID))
                .select((
                    changelog::row_action,
                    changelog::store_id,
                    changelog::source_site_id,
                ))
                .load(self.connection.lock().connection())
                .unwrap()
        }
    }

    // `stock-movement-detail` → `stock-movement-lines` is in the real map, with
    // `groupRows`, so this runs the fragment exactly as it ships.
    fn old_stock_movement_layout() -> Value {
        json!({
            "stock-movement-detail": {
                "columnOrder": ["stockLine.item.code", "mrt-row-select", "numberOfPacks"],
                "columnSizing": { "stockLine.item.code": 200 },
                "grouping": ["stockLine.item.code"]
            }
        })
    }

    #[actix_rt::test]
    async fn converts_old_layouts_and_writes_a_changelog_row() {
        let fixture = Fixture::new("converts").await;
        let old = old_stock_movement_layout();
        fixture.insert_old(&old);
        fixture.set_central_site_id(42);

        fixture.migrate();

        assert_eq!(fixture.new_key().as_deref(), Some(NEW_KEY));
        assert_eq!(
            fixture.new_value(),
            Some(json!({
                "stock-movement-lines": {
                    "base": {
                        "columnOrder": ["itemCode", "numberOfPacks"],
                        "columnSizing": { "itemCode": 12.5 },
                        "groupRows": true
                    }
                }
            }))
        );
        // The React front end still reads the old preference.
        assert_eq!(
            fixture.value("global_table_configs_global"),
            Some(old.to_string())
        );
        assert_eq!(
            fixture.changelog(),
            vec![("UPSERT".to_string(), None, Some(42))]
        );
    }

    #[actix_rt::test]
    async fn copies_layouts_saved_in_the_new_ui_and_skips_unmapped_tables() {
        let fixture = Fixture::new("copies").await;
        let saved_in_new_ui = json!({ "base": { "columnOrder": ["itemCode"] } });
        fixture.insert_old(&json!({
            "stock-list": saved_in_new_ui,
            "not-a-table": { "columnOrder": ["code"] }
        }));

        fixture.migrate();

        assert_eq!(
            fixture.new_value(),
            Some(json!({ "stock-list": saved_in_new_ui }))
        );
        // With no central site id yet, the OMS-central convention.
        assert_eq!(
            fixture.changelog(),
            vec![("UPSERT".to_string(), None, Some(0))]
        );
    }

    #[actix_rt::test]
    async fn writes_nothing_without_an_old_preference() {
        let fixture = Fixture::new("no_old").await;

        fixture.migrate();

        assert_eq!(fixture.value(NEW_ID), None);
        assert!(fixture.changelog().is_empty());
    }

    #[actix_rt::test]
    async fn writes_nothing_for_an_empty_or_unreadable_old_preference() {
        for (name, value) in [
            ("empty_object", "{}"),
            ("not_json", "not json"),
            ("not_an_object", "[]"),
            (
                "nothing_carries_over",
                r#"{"not-a-table":{"columnOrder":["code"]}}"#,
            ),
        ] {
            let fixture = Fixture::new(name).await;
            fixture.insert_preference("global_table_configs_global", OLD_KEY, value, None);

            fixture.migrate();

            assert_eq!(fixture.value(NEW_ID), None, "{name}");
            assert!(fixture.changelog().is_empty(), "{name}");
        }
    }

    #[actix_rt::test]
    async fn leaves_an_existing_new_preference_alone() {
        let fixture = Fixture::new("existing").await;
        fixture.insert_old(&old_stock_movement_layout());
        // Saved by an admin in the Solid front end on the central server, and
        // pulled by this remote before it upgraded.
        let from_central = json!({ "stock-movement-lines": { "base": { "viewMode": "card" } } });
        fixture.insert_preference(NEW_ID, NEW_KEY, &from_central.to_string(), None);

        fixture.migrate();

        assert_eq!(fixture.new_value(), Some(from_central));
        assert!(fixture.changelog().is_empty());
    }
}
