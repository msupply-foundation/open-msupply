use crate::{db_diesel::changelog::ensure_partition_lookahead, migrations::*, StorageConnection};
use diesel::{
    dsl::{max, sql},
    prelude::*,
    sql_types::{Bool, Integer, Nullable},
};

// Minimal local table definitions for the columns this migration reads and writes, as
// they exist in the 3.01.1 schema. The crate's own definitions track the current
// schema and could drift away from what a database at this version actually has. The
// same applies to key_value_store, which is read with literal key strings below rather
// than through `KeyType`, whose variants can be renamed or removed.
table! {
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> Text,
        record_id -> Text,
        row_action -> Text,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
        transfer_store_id -> Nullable<Text>,
        patient_link_id -> Nullable<Text>,
    }
}

diesel::alias!(changelog as latest: Latest);

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "relog_changelog_dropped_by_v6_push_filter"
    }

    /// Re-log records this site authored in v6-transport tables, so they get pushed to
    /// OMS central again.
    ///
    /// From the introduction of sync v7 until the fix in
    /// `build_v6_push_filter` (msupply-foundation/open-msupply#12594), the v6 push
    /// filter required `source_site_id IS NULL`. Local edits are stamped with this
    /// site's id, so the filter matched nothing, and because an empty batch still
    /// advances `SyncPushCursorV6` to the max cursor, every locally authored row was
    /// skipped for good. Sites that then transitioned to v7 copied that cursor into
    /// `SyncPushCursorV7`, so the same rows were skipped on v7 too.
    ///
    /// A second, older gap: rows written before the v7 upgrade have a null
    /// `source_site_id` (pre-v7 only stamped it on rows integrated from sync, together
    /// with `is_sync_update = true`). Neither the v6 nor the v7 push filter selects
    /// them.
    ///
    /// Rewinding cursors would re-push the whole changelog, so instead insert a fresh
    /// changelog row (stamped with this site's id) for the latest changelog of every
    /// distinct record this site authored in a v6-transport table that a remote is
    /// allowed to author. The fresh rows sit past both push cursors and are picked up
    /// by whichever transport the site is on. Pushing sends the current row state, so
    /// re-pushing records that did make it to central is an idempotent upsert, and
    /// `query_with_data` dedups by record so the extra rows cost nothing.
    ///
    /// Known side effect: re-integrating a `contact_form` on central writes a new
    /// changelog row there, and the contact form processor emails the Foundation's
    /// support/feedback inboxes for every contact_form changelog row without dedup. So
    /// every form ever submitted is emailed once more. Accepted, since the form is
    /// rarely used and the recipients are our own team.
    ///
    /// Skipped on central: central does not push, and re-logging its own records would
    /// only re-broadcast them to every remote. Central cannot be detected directly on a
    /// database upgrading from 2.x or earlier (the `site` table is only filled by sync
    /// after startup, and the standalone-central flag did not exist before 3.x), so
    /// instead run when the site has pushed over v6 or v7, which only remotes do.
    ///
    /// A database that started this upgrade below 2.0 has no push cursor either, but
    /// it also cannot be a central, since OMS central arrived with v6 in 2.0. Its
    /// locally authored rows in these tables (and the encounter/vaccination changelog
    /// rows the 2.14 migration inserts with a null source) would never pass the fixed
    /// push filter, so it is included too.
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        let started_before_v6 = config
            .starting_database_version
            .as_ref()
            .is_some_and(|version| *version < Version::from_str("2.0.0"));
        let is_remote = started_before_v6 || has_pushed_over_v6_or_v7(connection)?;
        if !is_remote || is_standalone_central(connection)? {
            return Ok(());
        }

        let Some(site_id) = site_id(connection)? else {
            // Not initialised yet, nothing was ever authored here.
            return Ok(());
        };

        let tables = REMOTE_AUTHORED_V6_TABLES;

        // Cursor of the latest changelog row per record this site authored. Pre-v7
        // local edits have a null source_site_id and is_sync_update = false; v7-era
        // local edits carry this site's id. Aliased because it is used as a subquery
        // against the same table.
        let latest_authored_here = || {
            latest
                .filter(latest.field(changelog::table_name).eq_any(tables))
                .filter(
                    latest
                        .field(changelog::source_site_id)
                        .is_null()
                        .and(latest.field(changelog::is_sync_update).eq(false))
                        .or(latest.field(changelog::source_site_id).eq(site_id)),
                )
                .group_by((
                    latest.field(changelog::table_name),
                    latest.field(changelog::record_id),
                ))
                .select(max(latest.field(changelog::cursor)).assume_not_null())
        };

        let to_insert: i64 = changelog::table
            .filter(changelog::cursor.eq_any(latest_authored_here()))
            .count()
            .get_result(connection.lock().connection())?;
        if to_insert == 0 {
            return Ok(());
        }

        // Postgres partitions the changelog by cursor range; make sure the fresh rows
        // have somewhere to land. No-op on sqlite.
        ensure_partition_lookahead(
            connection,
            &ChangelogPartitionConfig {
                partition_size: config.changelog_partition.partition_size,
                lookahead: config.changelog_partition.lookahead + to_insert,
            },
        )?;

        let fresh_rows = changelog::table
            .filter(changelog::cursor.eq_any(latest_authored_here()))
            .order(changelog::cursor)
            .select((
                changelog::table_name,
                changelog::record_id,
                changelog::row_action,
                changelog::store_id,
                Some(site_id).into_sql::<Nullable<Integer>>(),
                changelog::transfer_store_id,
                changelog::patient_link_id,
            ));

        diesel::insert_into(changelog::table)
            .values(fresh_rows)
            .into_columns((
                changelog::table_name,
                changelog::record_id,
                changelog::row_action,
                changelog::store_id,
                changelog::source_site_id,
                changelog::transfer_store_id,
                changelog::patient_link_id,
            ))
            .execute(connection.lock().connection())?;

        Ok(())
    }
}

/// Tables that, as of 3.01.1, sync only over v6 (owned by OMS central rather than
/// legacy mSupply) and that a remote site is allowed to author. Central-only tables
/// never had anything to push from a remote. Hard-coded rather than derived from
/// `ChangelogTableName::sync_style()` so that later changes to a table's transport or
/// authoring do not alter what this migration does to an older database.
const REMOTE_AUTHORED_V6_TABLES: &[&str] = &[
    "asset",
    "asset_internal_location",
    "asset_log",
    "contact_form",
    "contact_trace",
    "encounter",
    "name_oms_fields",
    "plugin_data",
    "preference",
    "rnr_form",
    "rnr_form_line",
    "sync_file_reference",
    "system_log",
    "vaccination",
];

/// `SETTINGS_SYNC_SITE_ID` from key_value_store, null when the site is not initialised.
fn site_id(connection: &StorageConnection) -> anyhow::Result<Option<i32>> {
    // A scalar subquery so that a missing row reads as null rather than NotFound. The
    // key is an inline literal because on Postgres the id column is the `key_type`
    // enum, which does not compare with a text bind parameter.
    let site_id = diesel::select(sql::<Nullable<Integer>>(
        "(SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_SITE_ID')",
    ))
    .get_result(connection.lock().connection())?;
    Ok(site_id)
}

/// Whether a v6 or v7 push cursor has ever been written. Only the remote sync clients
/// write them, at first initialisation and on every push; the central server never
/// runs those clients (in 2.x or 3.x), so it never has either key.
fn has_pushed_over_v6_or_v7(connection: &StorageConnection) -> anyhow::Result<bool> {
    let cursor_key: Option<i32> = diesel::select(sql::<Nullable<Integer>>(
        "(SELECT 1 FROM key_value_store \
            WHERE id IN ('SYNC_PUSH_CURSOR_V6', 'SYNC_PUSH_CURSOR_V7') LIMIT 1)",
    ))
    .get_result(connection.lock().connection())?;
    Ok(cursor_key.is_some())
}

/// Belt and braces: a standalone central never pushes, so it fails the cursor check
/// anyway, but the flag is explicit and cheap.
fn is_standalone_central(connection: &StorageConnection) -> anyhow::Result<bool> {
    let is_standalone_central: Option<bool> = diesel::select(sql::<Nullable<Bool>>(
        "(SELECT value_bool FROM key_value_store WHERE id = 'IS_STANDALONE_CENTRAL')",
    ))
    .get_result(connection.lock().connection())?;
    Ok(is_standalone_central.unwrap_or(false))
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v3_00_00::V3_00_00, v3_01_01::V3_01_01, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*};

    use super::changelog;

    const THIS_SITE_ID: i32 = 5;
    const CENTRAL_SITE_ID: i32 = 42;

    /// (table_name, record_id, row_action, store_id, source_site_id)
    type ChangelogSummary = (String, String, String, Option<String>, Option<i32>);

    /// A mix of rows as a remote would hold them after living through 2.x and 3.x.
    /// Only the first three records should be re-logged.
    const SEED_CHANGELOG: &str = r#"
        INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update, source_site_id) VALUES
            -- 2.x local edit: null source_site_id, not a sync update
            ('name_oms_fields', 'nof_legacy_local', 'UPSERT', NULL, FALSE, NULL),
            -- 3.x local edit, stamped with this site
            ('asset', 'asset_local', 'UPSERT', 'store_a', FALSE, 5),
            -- 3.x local edit then delete of the same record: only the latest is re-logged
            ('vaccination', 'vacc_deleted', 'UPSERT', 'store_a', FALSE, 5),
            ('vaccination', 'vacc_deleted', 'DELETE', 'store_a', FALSE, 5),
            -- Integrated from central in 3.x
            ('asset', 'asset_from_central', 'UPSERT', 'store_a', FALSE, 42),
            -- Integrated from sync in 2.x: null source_site_id but flagged as a sync update
            ('asset', 'asset_legacy_synced', 'UPSERT', NULL, TRUE, NULL),
            -- Central-only table, nothing for a remote to push
            ('asset_catalogue_type', 'act_local', 'UPSERT', NULL, FALSE, 5),
            -- v5 (legacy) table, not pushed over v6
            ('stocktake', 'stocktake_local', 'UPSERT', 'store_a', FALSE, 5);
    "#;

    fn seed(connection: &StorageConnection, sql: &str) {
        connection.lock().connection().batch_execute(sql).unwrap();
    }

    fn max_cursor(connection: &StorageConnection) -> i64 {
        changelog::table
            .select(diesel::dsl::max(changelog::cursor))
            .first::<Option<i64>>(connection.lock().connection())
            .unwrap()
            .unwrap_or(0)
    }

    fn rows_after(connection: &StorageConnection, cursor: i64) -> Vec<ChangelogSummary> {
        changelog::table
            .filter(changelog::cursor.gt(cursor))
            .order((changelog::table_name, changelog::record_id))
            .select((
                changelog::table_name,
                changelog::record_id,
                changelog::row_action,
                changelog::store_id,
                changelog::source_site_id,
            ))
            .load(connection.lock().connection())
            .unwrap()
    }

    async fn setup(db_name: &str) -> StorageConnection {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(V3_00_00.version()),
            ..Default::default()
        })
        .await;
        connection
    }

    fn run(connection: &StorageConnection) {
        let version = V3_01_01.version();
        migrate(
            connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(connection), version);
    }

    #[actix_rt::test]
    async fn relogs_records_authored_on_remote() {
        let connection = setup("migration_relog_v6_dropped_remote").await;
        seed(
            &connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_SITE_ID', {THIS_SITE_ID}),
                    ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', {CENTRAL_SITE_ID}),
                    ('SYNC_PUSH_CURSOR_V6', 100);"
            ),
        );
        seed(&connection, SEED_CHANGELOG);
        let before = max_cursor(&connection);

        run(&connection);

        assert_eq!(
            rows_after(&connection, before),
            vec![
                (
                    "asset".to_string(),
                    "asset_local".to_string(),
                    "UPSERT".to_string(),
                    Some("store_a".to_string()),
                    Some(THIS_SITE_ID),
                ),
                (
                    "name_oms_fields".to_string(),
                    "nof_legacy_local".to_string(),
                    "UPSERT".to_string(),
                    None,
                    Some(THIS_SITE_ID),
                ),
                (
                    "vaccination".to_string(),
                    "vacc_deleted".to_string(),
                    "DELETE".to_string(),
                    Some("store_a".to_string()),
                    Some(THIS_SITE_ID),
                ),
            ]
        );

        // Re-running is idempotent in effect: the fresh rows are themselves "authored
        // here", so a second pass re-logs the same three records, no more.
        let before_second = max_cursor(&connection);
        super::Migrate
            .migrate_with_config(&connection, &MigrationConfig::default())
            .unwrap();
        assert_eq!(rows_after(&connection, before_second).len(), 3);
    }

    #[actix_rt::test]
    async fn relogs_on_site_that_only_pushed_over_v7() {
        let connection = setup("migration_relog_v6_dropped_v7_only").await;
        seed(
            &connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_SITE_ID', {THIS_SITE_ID}),
                    ('SYNC_PUSH_CURSOR_V7', 100);"
            ),
        );
        seed(&connection, SEED_CHANGELOG);
        let before = max_cursor(&connection);

        run(&connection);

        assert_eq!(rows_after(&connection, before).len(), 3);
    }

    /// A database that started the upgrade below 2.0 predates OMS central, so it is a
    /// remote even without a push cursor.
    #[actix_rt::test]
    async fn relogs_on_database_that_started_before_v6() {
        let connection = setup("migration_relog_v6_dropped_pre_v6").await;
        seed(
            &connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_SITE_ID', {THIS_SITE_ID});"
            ),
        );
        seed(&connection, SEED_CHANGELOG);
        let before = max_cursor(&connection);

        let config = MigrationConfig {
            starting_database_version: Some(Version::from_str("1.7.0")),
            ..Default::default()
        };
        super::Migrate
            .migrate_with_config(&connection, &config)
            .unwrap();

        assert_eq!(rows_after(&connection, before).len(), 3);
    }

    /// A central server (of any origin version from 2.0 on) has a site id but has
    /// never run the v6 or v7 push, so it has no push cursor.
    #[actix_rt::test]
    async fn skips_central_server() {
        let connection = setup("migration_relog_v6_dropped_central").await;
        seed(
            &connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_SITE_ID', {THIS_SITE_ID}),
                    ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', {CENTRAL_SITE_ID});"
            ),
        );
        seed(&connection, SEED_CHANGELOG);
        let before = max_cursor(&connection);

        run(&connection);

        assert_eq!(rows_after(&connection, before), vec![]);
    }

    #[actix_rt::test]
    async fn skips_standalone_central() {
        let connection = setup("migration_relog_v6_dropped_standalone").await;
        seed(
            &connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_SITE_ID', {THIS_SITE_ID}),
                    ('SYNC_PUSH_CURSOR_V7', 100);
                 INSERT INTO key_value_store (id, value_bool) VALUES
                    ('IS_STANDALONE_CENTRAL', TRUE);"
            ),
        );
        seed(&connection, SEED_CHANGELOG);
        let before = max_cursor(&connection);

        run(&connection);

        assert_eq!(rows_after(&connection, before), vec![]);
    }

    #[actix_rt::test]
    async fn skips_uninitialised_site() {
        let connection = setup("migration_relog_v6_dropped_uninitialised").await;
        seed(&connection, SEED_CHANGELOG);
        let before = max_cursor(&connection);

        run(&connection);

        assert_eq!(rows_after(&connection, before), vec![]);
    }
}
