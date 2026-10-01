use crate::{migrations::*, StorageConnection};
use diesel::{
    dsl::sql,
    prelude::*,
    sql_types::{Integer, Nullable},
};

// Minimal local table definitions for the columns this migration reads and writes, as
// they exist in the 3.3.1 schema. The crate's own definitions track the current schema
// and could drift away from what a database at this version actually has. The same
// applies to key_value_store, which is read with literal key strings below rather than
// through `KeyType`, whose variants can be renamed or removed.
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

    /// Stamp this site's id on the changelog rows it authored before upgrading from 2.x
    /// and hadn't yet pushed, so its first 3.x push sends them.
    ///
    /// Before 3.0, a site wrote its own edits to the changelog with `source_site_id =
    /// NULL` and `is_sync_update = false`. The 2.x pushes selected by `is_sync_update`,
    /// so the null didn't matter. The 3.x pushes select by `source_site_id` (legacy:
    /// `!= <legacy central site id>`, v6: `= <own site id>`), which a null never
    /// passes. So every edit still waiting to be pushed at upgrade time was skipped, and
    /// the first 3.x push moved its cursor past it for good (#973).
    ///
    /// These rows are still ahead of the push cursors, because 3.x hasn't pushed yet, so
    /// stamping them in place is enough. Each push then sends what it hadn't sent: legacy
    /// central gets every table below, and a remote's v6 push to OMS central also gets
    /// names and name store joins, as in 2.x. Rows behind both cursors are left alone.
    /// They were pushed under 2.x and no push reads them again.
    ///
    /// 2.x stored each push cursor as the next row to push, and 3.x reads it as the last
    /// row pushed. So the row at each cursor is included here, and both cursors are moved
    /// back by one so the 3.x push reads that row too (#966).
    ///
    /// Only runs on a database upgrading from 2.x. Once a site has pushed on 3.x its
    /// cursors are past every 2.x row and hold 3.x values, so there's nothing to stamp
    /// and moving a cursor back would re-push a row.
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        let started_before_v3 = config
            .starting_database_version
            .as_ref()
            .is_some_and(|version| *version < Version::from_str("3.0.0"));
        if !started_before_v3 {
            return Ok(());
        }

        let Some(site_id) = key_value_int(connection, "SETTINGS_SYNC_SITE_ID")? else {
            // Not initialised yet, nothing was ever authored here.
            return Ok(());
        };

        // Legacy central push cursor (central and remotes) and v6 push cursor (remotes
        // that sync with OMS central). Start from the earlier one, so each push finds
        // everything it hadn't sent. A row only one push hadn't sent gets stamped too,
        // and the other push doesn't read it again because it's behind that push's cursor.
        let push_cursors = [
            key_value_int(connection, "REMOTE_SYNC_PUSH_CURSOR")?,
            key_value_int(connection, "SYNC_PUSH_CURSOR_V6")?,
        ];
        let Some(first_unpushed) = push_cursors.iter().flatten().copied().min() else {
            return Ok(());
        };

        // Same store condition as the 2.x remote push: stores on this site, or no store.
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

        // Inline key literals: on Postgres the id column is the `key_type` enum, which
        // does not compare with a text bind parameter.
        sql!(
            connection,
            "UPDATE key_value_store SET value_int = value_int - 1 \
                WHERE id IN ('REMOTE_SYNC_PUSH_CURSOR', 'SYNC_PUSH_CURSOR_V6') AND value_int > 0;"
        )?;

        Ok(())
    }
}

/// Tables that 2.21.4 pushed to legacy central: the `Legacy` sync style tables that
/// have a translator. All of them are still pushed to legacy central in 3.3.0. Left
/// out are the 2.x `Legacy` tables with no translator, which were never pushed
/// (`currency`, `insurance_provider`, `number`, `temperature_breach_config`), and
/// tables that only arrive from legacy central. Hard-coded so that later changes to a
/// table's sync style do not alter what this migration does to an older database.
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
    "temperature_breach",
    "temperature_log",
    "vvm_status_log",
];

/// `value_int` for a key_value_store key, null when the key isn't set.
fn key_value_int(connection: &StorageConnection, key: &str) -> anyhow::Result<Option<i32>> {
    // A scalar subquery so that a missing row reads as null rather than NotFound. The
    // key is an inline literal because on Postgres the id column is the `key_type`
    // enum, which does not compare with a text bind parameter.
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
        ChangelogFilter, ChangelogRepository, CursorAndLimit,
    };
    use diesel::{connection::SimpleConnection, prelude::*};

    use super::changelog;

    const THIS_SITE_ID: i32 = 5;
    const OTHER_SITE_ID: i32 = 6;
    const LEGACY_CENTRAL_SITE_ID: i32 = 42;

    /// Changelog rows in cursor order, as a site holds them at upgrade time. The push
    /// cursors are set relative to them in `seed_push_cursors`.
    const SEED_CHANGELOG: &str = r#"
        INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update, source_site_id) VALUES
            -- Pushed everywhere under 2.x
            ('invoice', 'invoice_pushed', 'UPSERT', 'store_a', FALSE, NULL),
            -- Pushed to legacy central but not yet to OMS central (the v6 cursor points here)
            ('name', 'name_not_on_oms_central', 'UPSERT', NULL, FALSE, NULL),
            -- First row the legacy push hadn't sent (the legacy cursor points here)
            ('stocktake', 'stocktake_at_cursor', 'UPSERT', 'store_a', FALSE, NULL),
            ('invoice', 'invoice_unpushed', 'UPSERT', 'store_a', FALSE, NULL),
            ('name_store_join', 'name_store_join_unpushed', 'UPSERT', 'store_a', FALSE, NULL),
            -- Store on another site
            ('invoice', 'invoice_other_site', 'UPSERT', 'store_b', FALSE, NULL),
            -- Integrated from legacy central
            ('item', 'item_from_legacy', 'UPSERT', NULL, TRUE, 42),
            -- Integrated from OMS central, which 2.x left without a source
            ('invoice', 'invoice_from_oms_central', 'UPSERT', 'store_a', TRUE, NULL),
            -- v6-only table, re-logged by relog_changelog_dropped_by_v6_push_filter instead
            ('asset', 'asset_local', 'UPSERT', 'store_a', FALSE, NULL),
            -- Legacy table that 2.x never pushed
            ('currency', 'currency_local', 'UPSERT', NULL, FALSE, NULL);
    "#;

    /// (record_id, source_site_id) for every seeded row
    type Stamps = Vec<(String, Option<i32>)>;

    fn seed(connection: &StorageConnection, sql: &str) {
        connection.lock().connection().batch_execute(sql).unwrap();
    }

    fn seed_stores(connection: &StorageConnection) {
        seed(
            connection,
            &format!(
                "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('store_a_name', 'FACILITY', FALSE, FALSE, 'STA', 'Store A'),
                    ('store_b_name', 'FACILITY', FALSE, FALSE, 'STB', 'Store B');
                 INSERT INTO name_link (id, name_id) VALUES
                    ('store_a_name', 'store_a_name'),
                    ('store_b_name', 'store_b_name');
                 INSERT INTO store (id, name_link_id, code, site_id) VALUES
                    ('store_a', 'store_a_name', 'STORE_A', {THIS_SITE_ID}),
                    ('store_b', 'store_b_name', 'STORE_B', {OTHER_SITE_ID});"
            ),
        );
    }

    fn cursor_of(connection: &StorageConnection, record_id: &str) -> i32 {
        changelog::table
            .filter(changelog::record_id.eq(record_id))
            .select(changelog::cursor)
            .first::<i64>(connection.lock().connection())
            .unwrap() as i32
    }

    /// Point the legacy cursor at the first row it hadn't pushed and, if `with_v6`, the
    /// v6 cursor at the name only legacy central has. Returns (legacy, v6).
    fn seed_push_cursors(connection: &StorageConnection, with_v6: bool) -> (i32, i32) {
        let legacy = cursor_of(connection, "stocktake_at_cursor");
        let v6 = cursor_of(connection, "name_not_on_oms_central");
        seed(
            connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_SITE_ID', {THIS_SITE_ID}),
                    ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', {LEGACY_CENTRAL_SITE_ID}),
                    ('REMOTE_SYNC_PUSH_CURSOR', {legacy});"
            ),
        );
        if with_v6 {
            seed(
                connection,
                &format!(
                    "INSERT INTO key_value_store (id, value_int) VALUES ('SYNC_PUSH_CURSOR_V6', {v6});"
                ),
            );
        }
        (legacy, v6)
    }

    fn key_value_int(connection: &StorageConnection, key: &str) -> Option<i32> {
        super::key_value_int(connection, key).unwrap()
    }

    /// Every seeded row, with its source before the migration.
    const SEEDED: &[(&str, Option<i32>)] = &[
        ("invoice_pushed", None),
        ("name_not_on_oms_central", None),
        ("stocktake_at_cursor", None),
        ("invoice_unpushed", None),
        ("name_store_join_unpushed", None),
        ("invoice_other_site", None),
        ("item_from_legacy", Some(LEGACY_CENTRAL_SITE_ID)),
        ("invoice_from_oms_central", None),
        ("asset_local", None),
        ("currency_local", None),
    ];

    /// Source of each seeded row. The re-log of `asset_local` by an earlier fragment is a
    /// new row past the last seeded cursor, so it is left out.
    fn stamps(connection: &StorageConnection) -> Stamps {
        let last_seeded = cursor_of(connection, "currency_local") as i64;
        let seeded_ids: Vec<&str> = SEEDED.iter().map(|(record_id, _)| *record_id).collect();
        changelog::table
            .filter(changelog::cursor.le(last_seeded))
            .filter(changelog::record_id.eq_any(seeded_ids))
            .order(changelog::cursor)
            .select((changelog::record_id, changelog::source_site_id))
            .load(connection.lock().connection())
            .unwrap()
    }

    fn expected(stamped: &[&str]) -> Stamps {
        SEEDED
            .iter()
            .copied()
            .map(|(record_id, source)| {
                let source = if stamped.contains(&record_id) {
                    Some(THIS_SITE_ID)
                } else {
                    source
                };
                (record_id.to_string(), source)
            })
            .collect()
    }

    async fn setup(db_name: &str, version: Version) -> StorageConnection {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(version),
            ..Default::default()
        })
        .await;
        seed_stores(&connection);
        seed(&connection, SEED_CHANGELOG);
        connection
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
    async fn stamps_unpushed_rows_on_remote_upgrading_from_2x() {
        let connection = setup("migration_stamp_unpushed_remote", V2_21_01.version()).await;
        let (legacy, v6) = seed_push_cursors(&connection, true);

        run(&connection);

        assert_eq!(
            stamps(&connection),
            expected(&[
                "name_not_on_oms_central",
                "stocktake_at_cursor",
                "invoice_unpushed",
                "name_store_join_unpushed",
            ])
        );
        assert_eq!(
            key_value_int(&connection, "REMOTE_SYNC_PUSH_CURSOR"),
            Some(legacy - 1)
        );
        assert_eq!(
            key_value_int(&connection, "SYNC_PUSH_CURSOR_V6"),
            Some(v6 - 1)
        );

        // The legacy push reads from its moved-back cursor, so it picks up the row the
        // 2.x cursor pointed at, then the rest of the unpushed rows.
        let pushed: Vec<String> = ChangelogRepository::new(&connection)
            .query(
                ChangelogFilter::all_data_for_legacy_central(&connection).unwrap(),
                CursorAndLimit {
                    cursor: (legacy - 1) as i64,
                    limit: 100,
                },
            )
            .unwrap()
            .rows
            .into_iter()
            .map(|row| row.record_id)
            .collect();
        assert_eq!(
            pushed,
            vec![
                "stocktake_at_cursor",
                "invoice_unpushed",
                "name_store_join_unpushed"
            ]
        );
    }

    /// Central pushes to legacy central only, so it has no v6 push cursor.
    #[actix_rt::test]
    async fn stamps_unpushed_rows_on_central_upgrading_from_2x() {
        let connection = setup("migration_stamp_unpushed_central", V2_21_01.version()).await;
        let (legacy, _) = seed_push_cursors(&connection, false);

        run(&connection);

        assert_eq!(
            stamps(&connection),
            expected(&[
                "stocktake_at_cursor",
                "invoice_unpushed",
                "name_store_join_unpushed",
            ])
        );
        assert_eq!(
            key_value_int(&connection, "REMOTE_SYNC_PUSH_CURSOR"),
            Some(legacy - 1)
        );
        assert_eq!(key_value_int(&connection, "SYNC_PUSH_CURSOR_V6"), None);
    }

    /// A database already on 3.x has pushed, so its cursors hold 3.x values.
    #[actix_rt::test]
    async fn skips_database_already_on_v3() {
        let connection = setup("migration_stamp_unpushed_v3", V3_02_00.version()).await;
        let (legacy, v6) = seed_push_cursors(&connection, true);

        run(&connection);

        assert_eq!(stamps(&connection), expected(&[]));
        assert_eq!(
            key_value_int(&connection, "REMOTE_SYNC_PUSH_CURSOR"),
            Some(legacy)
        );
        assert_eq!(key_value_int(&connection, "SYNC_PUSH_CURSOR_V6"), Some(v6));
    }

    #[actix_rt::test]
    async fn skips_uninitialised_site() {
        let connection = setup("migration_stamp_unpushed_uninitialised", V2_21_01.version()).await;

        run(&connection);

        assert_eq!(stamps(&connection), expected(&[]));
    }
}
