use crate::{StorageConnection, migrations::*};
use diesel::{
    dsl::sql,
    prelude::*,
    sql_types::{Integer, Nullable},
};

// Local table definitions as of 3.3.1, so later schema changes don't affect this migration.
table! {
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> Text,
        record_id -> Text,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
    }
}

table! {
    store (id) {
        id -> Text,
        site_id -> Integer,
    }
}

allow_tables_to_appear_in_same_query!(changelog, store);

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "stamp_changelog_unpushed_before_v3"
    }

    /// 2.x left `source_site_id` null on a site's own changelog rows, and 3.x pushes only
    /// select rows with a source, so edits not yet pushed at upgrade were never sent
    /// (#973). Stamp them with the site's id.
    ///
    /// 2.x stored push cursors as the next row to push, 3.x reads them as the last row
    /// pushed, so the row at the cursor is included and both cursors move back one (#966).
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        let started_before_v3 = config
            .starting_database_version
            .as_ref()
            .is_some_and(|version| *version < Version::from_str("3.0.0"));
        // A site that has pushed on 3.x is already past these rows.
        if !started_before_v3 {
            return Ok(());
        }

        let Some(site_id) = key_value_int(connection, "SETTINGS_SYNC_SITE_ID")? else {
            return Ok(());
        };

        // From the earlier of the legacy and v6 push cursors.
        let push_cursors = [
            key_value_int(connection, "REMOTE_SYNC_PUSH_CURSOR")?,
            key_value_int(connection, "SYNC_PUSH_CURSOR_V6")?,
        ];
        let Some(first_unpushed) = push_cursors.iter().flatten().copied().min() else {
            return Ok(());
        };

        // Same store condition as the 2.x push.
        let active_store_ids = store::table
            .filter(store::site_id.eq(site_id))
            .select(store::id.nullable());

        diesel::update(changelog::table)
            .filter(changelog::cursor.ge(first_unpushed as i64))
            .filter(changelog::table_name.eq_any(PUSHED_TO_LEGACY_TABLES))
            .filter(changelog::source_site_id.is_null())
            .filter(changelog::is_sync_update.eq(false))
            .filter(
                changelog::store_id
                    .is_null()
                    .or(changelog::store_id.eq_any(active_store_ids)),
            )
            .set(changelog::source_site_id.eq(site_id))
            .execute(connection.lock().connection())?;

        sql!(
            connection,
            "UPDATE key_value_store SET value_int = value_int - 1 \
                WHERE id IN ('REMOTE_SYNC_PUSH_CURSOR', 'SYNC_PUSH_CURSOR_V6') AND value_int > 0;"
        )?;

        Ok(())
    }
}

/// Tables 2.21.4 pushed to legacy central, hard-coded so later sync style changes don't
/// affect this migration.
const PUSHED_TO_LEGACY_TABLES: &[&str] = &[
    "activity_log",
    "barcode",
    "clinician",
    "clinician_store_join",
    "document",
    "indicator_value",
    "invoice",
    "invoice_line",
    "item",
    "location",
    "location_movement",
    "name",
    "name_insurance_join",
    "name_store_join",
    "purchase_order",
    "purchase_order_line",
    "requisition",
    "requisition_line",
    "sensor",
    "stock_line",
    "stocktake",
    "stocktake_line",
    "sync_message",
    "temperature_breach",
    "temperature_log",
    "vvm_status_log",
];

fn key_value_int(connection: &StorageConnection, key: &str) -> anyhow::Result<Option<i32>> {
    // Inline key literal: on Postgres `id` is the `key_type` enum.
    let value = diesel::select(sql::<Nullable<Integer>>(&format!(
        "(SELECT value_int FROM key_value_store WHERE id = '{key}')"
    )))
    .get_result(connection.lock().connection())?;
    Ok(value)
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_21_01::V2_21_01, v3_02_00::V3_02_00, v3_03_01::V3_03_01, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*};

    use super::changelog;

    const SITE_ID: i32 = 5;

    const SEEDED: &[&str] = &[
        "invoice_pushed",
        "stocktake_at_cursor",
        "item_received",
        "invoice_unpushed",
    ];

    fn seed(connection: &StorageConnection, sql: &str) {
        connection.lock().connection().batch_execute(sql).unwrap();
    }

    fn cursor_of(connection: &StorageConnection, record_id: &str) -> i32 {
        changelog::table
            .filter(changelog::record_id.eq(record_id))
            .select(changelog::cursor)
            .first::<i64>(connection.lock().connection())
            .unwrap() as i32
    }

    fn key_value_int(connection: &StorageConnection, key: &str) -> Option<i32> {
        super::key_value_int(connection, key).unwrap()
    }

    fn stamps(connection: &StorageConnection) -> Vec<(String, Option<i32>)> {
        changelog::table
            .filter(changelog::record_id.eq_any(SEEDED))
            .order(changelog::cursor)
            .select((changelog::record_id, changelog::source_site_id))
            .load(connection.lock().connection())
            .unwrap()
    }

    /// A 2.x remote: one pushed row, then unpushed rows. Returns the push cursor.
    async fn setup(db_name: &str, version: Version) -> (StorageConnection, i32) {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(version),
            ..Default::default()
        })
        .await;
        seed(
            &connection,
            &format!(
                "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('store_a_name', 'FACILITY', FALSE, FALSE, 'STA', 'Store A');
                 INSERT INTO name_link (id, name_id) VALUES ('store_a_name', 'store_a_name');
                 INSERT INTO store (id, name_link_id, code, site_id) VALUES
                    ('store_a', 'store_a_name', 'STORE_A', {SITE_ID});
                 INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update, source_site_id) VALUES
                    ('invoice', 'invoice_pushed', 'UPSERT', 'store_a', FALSE, NULL),
                    ('stocktake', 'stocktake_at_cursor', 'UPSERT', 'store_a', FALSE, NULL),
                    -- Received through sync
                    ('item', 'item_received', 'UPSERT', NULL, TRUE, NULL),
                    ('invoice', 'invoice_unpushed', 'UPSERT', 'store_a', FALSE, NULL);"
            ),
        );
        let cursor = cursor_of(&connection, "stocktake_at_cursor");
        seed(
            &connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_SITE_ID', {SITE_ID}),
                    ('REMOTE_SYNC_PUSH_CURSOR', {cursor}),
                    ('SYNC_PUSH_CURSOR_V6', {cursor});"
            ),
        );
        (connection, cursor)
    }

    fn run(connection: &StorageConnection) {
        let version = V3_03_01.version();
        migrate(
            connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(connection), version);
    }

    #[actix_rt::test]
    async fn stamps_unpushed_rows_on_site_upgrading_from_2x() {
        let (connection, cursor) = setup("migration_stamp_unpushed_2x", V2_21_01.version()).await;

        run(&connection);

        assert_eq!(
            stamps(&connection),
            vec![
                ("invoice_pushed".to_string(), None),
                ("stocktake_at_cursor".to_string(), Some(SITE_ID)),
                ("item_received".to_string(), None),
                ("invoice_unpushed".to_string(), Some(SITE_ID)),
            ]
        );
        assert_eq!(
            key_value_int(&connection, "REMOTE_SYNC_PUSH_CURSOR"),
            Some(cursor - 1)
        );
        assert_eq!(
            key_value_int(&connection, "SYNC_PUSH_CURSOR_V6"),
            Some(cursor - 1)
        );
    }

    #[actix_rt::test]
    async fn skips_database_already_on_v3() {
        let (connection, cursor) = setup("migration_stamp_unpushed_v3", V3_02_00.version()).await;

        run(&connection);

        assert_eq!(
            stamps(&connection),
            SEEDED
                .iter()
                .map(|record_id| (record_id.to_string(), None))
                .collect::<Vec<_>>()
        );
        assert_eq!(
            key_value_int(&connection, "REMOTE_SYNC_PUSH_CURSOR"),
            Some(cursor)
        );
        assert_eq!(
            key_value_int(&connection, "SYNC_PUSH_CURSOR_V6"),
            Some(cursor)
        );
    }
}
