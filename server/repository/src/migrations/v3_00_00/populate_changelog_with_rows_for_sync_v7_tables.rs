use crate::migrations::*;
use diesel::connection::SimpleConnection;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "populate_changelog_with_rows_for_sync_v7_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Central reference tables that need to surface their existing rows to sync v7.
        // Each table's `id` column is the changelog `record_id`; row_action is 'UPSERT'.
        const TABLES: &[&str] = &[
            "abbreviation",
            "category",
            "contact",
            "contact_trace",
            "context",
            "demographic_indicator",
            "diagnosis",
            "document_registry",
            "indicator_column",
            "indicator_line",
            "item_category_join",
            "item_direction",
            "item_store_join",
            "item_warning_join",
            "location_type",
            "master_list",
            "master_list_line",
            "master_list_name_join",
            "name_tag",
            "name_tag_join",
            "period",
            "period_schedule",
            "printer",
            "program",
            "program_enrolment",
            "program_event",
            "program_indicator",
            "program_requisition_order_type",
            "program_requisition_settings",
            "reason_option",
            "shipping_method",
            "site",
            "store",
            "store_preference",
            "unit",
            "user_account",
            "user_permission",
            "user_store_join",
            "vvm_status",
        ];

        // source_site_id mirrors rebuild_sync_buffer's pattern: prefer the central
        // server's site_id from key_value_store, fall back to 0 (OMS-Central
        // convention) when the key isn't set yet.
        let mut sql = String::new();
        for table in TABLES {
            sql.push_str(&format!(
                "INSERT INTO changelog (table_name, record_id, row_action, source_site_id) \
                 SELECT '{table}', CAST(t.id AS TEXT), 'UPSERT', \
                     COALESCE( \
                         (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID'), \
                         0 \
                     ) \
                 FROM {table} t;\n"
            ));
        }

        connection
            .lock()
            .connection()
            .batch_execute(&sql)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_18_00::V2_18_00, v3_00_00::V3_00_00, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*, RunQueryDsl};

    // Minimal changelog columns needed for verification.
    // The test runs the full v3_00_00 sequence, which includes the
    // partition_changelog_by_cursor rename, so the helper sees `patient_link_id`.
    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            row_action -> Text,
            store_id -> Nullable<Text>,
            source_site_id -> Nullable<Integer>,
            transfer_store_id -> Nullable<Text>,
            patient_link_id -> Nullable<Text>,
        }
    }

    /// Insert one row in a handful of representative tables so the loop's INSERT … SELECT
    /// gets exercised against actual rows.
    fn setup_test_data(connection: &StorageConnection) {
        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                -- Tables with no FKs of their own
                INSERT INTO unit (id, name, description, "index") VALUES ('unit1', 'Each', '', 1);
                INSERT INTO abbreviation (id, expansion, text) VALUES ('abbr1', 'tab', 't');

                -- master_list (no FKs to user data)
                INSERT INTO master_list (id, name, code, description, is_active) VALUES
                    ('ml1', 'Test ML', 'TML', '', true);

                -- store_preference uses the row id as the store id; insert a parent name + store
                INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('store_x_name', 'FACILITY', true, false, 'STX', 'Store X');
                INSERT INTO name_link (id, name_id) VALUES ('store_x_name', 'store_x_name');
                INSERT INTO store (id, name_link_id, code, site_id) VALUES
                    ('store_x', 'store_x_name', 'STORE_X', 1);
                INSERT INTO store_preference (id, type, pack_to_one) VALUES
                    ('store_x', 'STORE_PREFERENCES', false);

                -- user_account (central, no FKs to verify)
                INSERT INTO user_account (id, username, hashed_password) VALUES
                    ('user_x', 'user_x', 'hash');
                "#,
            )
            .unwrap();
    }

    fn seed_central_site_id(connection: &StorageConnection, site_id: i32) {
        connection
            .lock()
            .connection()
            .batch_execute(&format!(
                "INSERT INTO key_value_store (id, value_int) \
                 VALUES ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', {site_id});"
            ))
            .unwrap();
    }

    #[actix_rt::test]
    async fn test_populate_changelog_with_rows_for_sync_v7_tables() {
        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_populate_changelog_v7_tables",
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        setup_test_data(&connection);
        seed_central_site_id(&connection, 42);

        // Run all v3_00_00 migrations (this fragment + the others)
        migrate(&connection, Some(version.clone()), MigrationConfig::default()).unwrap();
        assert_eq!(get_database_version(&connection), version);

        // Helper: count changelog rows for a given (table_name, record_id)
        let count_for = |table: &str, id: &str| -> i64 {
            changelog::table
                .filter(changelog::table_name.eq(table))
                .filter(changelog::record_id.eq(id))
                .count()
                .get_result::<i64>(connection.lock().connection())
                .unwrap()
        };

        // Each newly-inserted record gets exactly one changelog row from the migration
        assert_eq!(count_for("unit", "unit1"), 1);
        assert_eq!(count_for("master_list", "ml1"), 1);
        assert_eq!(count_for("store", "store_x"), 1);
        assert_eq!(count_for("store_preference", "store_x"), 1);
        assert_eq!(count_for("user_account", "user_x"), 1);
        assert_eq!(count_for("abbreviation", "abbr1"), 1);

        // Verify each backfilled row has the expected shape: row_action='UPSERT',
        // source_site_id populated from the seeded central site id (42),
        // and the other extra columns NULL.
        let row = changelog::table
            .filter(changelog::table_name.eq("unit"))
            .filter(changelog::record_id.eq("unit1"))
            .select((
                changelog::row_action,
                changelog::store_id,
                changelog::source_site_id,
                changelog::transfer_store_id,
                changelog::patient_link_id,
            ))
            .first::<(String, Option<String>, Option<i32>, Option<String>, Option<String>)>(
                connection.lock().connection(),
            )
            .unwrap();
        assert_eq!(
            row,
            ("UPSERT".to_string(), None, Some(42), None, None),
            "expected ('UPSERT', NULL, Some(42), NULL, NULL) for unit/unit1"
        );
    }
}
