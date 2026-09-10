use crate::{
    db_diesel::changelog::{ensure_partition_lookahead, Authoring, ChangelogTableName},
    migrations::*,
    KeyType, KeyValueStoreRepository, StorageConnection,
};
use diesel::{prelude::*, sql_types::BigInt};
use strum::IntoEnumIterator;

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
    /// Skipped on central servers: central does not push, and re-logging its own
    /// records would only re-broadcast them to every remote. Central is detected by
    /// the `site` table having rows (site rows are only ever integrated on central) or
    /// the standalone-central flag.
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        if is_central_server(connection)? {
            return Ok(());
        }

        let Some(site_id) =
            KeyValueStoreRepository::new(connection).get_i32(KeyType::SettingsSyncSiteId)?
        else {
            // Not initialised yet, nothing was ever authored here.
            return Ok(());
        };

        let table_list = remote_authored_v6_tables()
            .iter()
            .map(|table| format!("'{table}'"))
            .collect::<Vec<_>>()
            .join(", ");

        // Latest changelog row per record this site authored. Pre-v7 local edits have
        // a null source_site_id and is_sync_update = false; v7-era local edits carry
        // this site's id.
        let latest_authored_here = format!(
            "SELECT table_name, record_id, MAX(cursor) AS cursor \
             FROM changelog \
             WHERE table_name IN ({table_list}) \
                 AND ( \
                     (source_site_id IS NULL AND is_sync_update = FALSE) \
                     OR source_site_id = {site_id} \
                 ) \
             GROUP BY table_name, record_id"
        );

        let to_insert = count(
            connection,
            &format!("SELECT COUNT(*) AS value FROM ({latest_authored_here}) latest"),
        )?;
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

        sql!(
            connection,
            r#"
            INSERT INTO changelog (
                table_name, record_id, row_action, store_id, source_site_id,
                transfer_store_id, patient_link_id
            )
            SELECT
                c.table_name, c.record_id, c.row_action, c.store_id, {site_id},
                c.transfer_store_id, c.patient_link_id
            FROM changelog c
            JOIN ({latest_authored_here}) latest ON latest.cursor = c.cursor
            ORDER BY c.cursor;
            "#
        )?;

        Ok(())
    }
}

/// Tables that sync only over v6 (i.e. owned by OMS central rather than legacy
/// mSupply) and that a remote site is allowed to author. Central-only tables never
/// had anything to push from a remote.
fn remote_authored_v6_tables() -> Vec<String> {
    ChangelogTableName::iter()
        .filter(|table| !matches!(table, ChangelogTableName::Other(_)))
        .filter(|table| {
            let style = table.sync_style();
            let v6_only = style.transport.is_v6 && !style.transport.is_v5;
            let remote_can_author = style
                .authoring
                .iter()
                .any(|authoring| !matches!(authoring, Authoring::Central | Authoring::LegacyOnly));
            v6_only && remote_can_author
        })
        .map(|table| table.to_string())
        .collect()
}

fn is_central_server(connection: &StorageConnection) -> anyhow::Result<bool> {
    let is_standalone_central = KeyValueStoreRepository::new(connection)
        .get_bool(KeyType::IsStandaloneCentral)?
        .unwrap_or(false);
    if is_standalone_central {
        return Ok(true);
    }

    // Site rows are only integrated on the central server (see SiteTranslation).
    Ok(count(connection, "SELECT COUNT(*) AS value FROM site")? > 0)
}

fn count(connection: &StorageConnection, query: &str) -> anyhow::Result<i64> {
    #[derive(QueryableByName)]
    struct Count {
        #[diesel(sql_type = BigInt)]
        value: i64,
    }
    let row: Count = diesel::sql_query(query).get_result(connection.lock().connection())?;
    Ok(row.value)
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v3_00_00::V3_00_00, v3_01_01::V3_01_01, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*, RunQueryDsl};

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
                    ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', {CENTRAL_SITE_ID});"
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
    async fn skips_central_server() {
        let connection = setup("migration_relog_v6_dropped_central").await;
        seed(
            &connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_SITE_ID', {THIS_SITE_ID}),
                    ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', {CENTRAL_SITE_ID});
                 INSERT INTO site (id, code, name) VALUES (7, 'REMOTE_A', 'Remote A');"
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
                    ('SETTINGS_SYNC_SITE_ID', {THIS_SITE_ID});
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
