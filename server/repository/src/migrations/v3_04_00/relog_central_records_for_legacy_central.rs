use crate::{StorageConnection, migrations::*};
use diesel::{
    dsl::sql,
    prelude::*,
    sql_types::{Bool, Integer, Nullable},
};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "relog_central_records_for_legacy_central"
    }

    /// Re-log the records central re-publishes to legacy mSupply, so the legacy push sends
    /// the ones it skipped.
    ///
    /// The legacy push only selected tables tagged v5, and these were tagged v6 only, so it
    /// moved its cursor past them without sending anything. Stamping the rows it skipped
    /// isn't enough, as the cursor is already past them: each record needs a new row.
    ///
    /// Each record gets a new row copied from its latest one. Nothing in the changelog marks
    /// where a central's 3.x rows start, so that is every record, as
    /// `relog_changelog_dropped_by_v6_push_filter` does. Records legacy central already has
    /// are sent again, an upsert of the same data, and remotes pull the new rows the same
    /// way as the old.
    ///
    /// A row without a source site is one of central's own 2.x rows that
    /// `stamp_central_unsent_before_v3` didn't stamp, so it gets central's id. Rows from
    /// legacy central keep its id, so the push still leaves them out.
    ///
    /// Skipped on a site upgrading from before 3.0: the 2.x legacy push had no table list, so
    /// it never skipped these, and `stamp_central_unsent_before_v3` gives central's own
    /// unpushed rows central's id, so the push sends them as they are.
    ///
    /// Only runs on central, as only central re-publishes these. Central can't be detected
    /// directly while migrating, so skip any site that has pushed over v6 or v7, which only
    /// remotes do, as `relog_changelog_dropped_by_v6_push_filter` does. A v5-only remote
    /// passes too, but re-logging there sends nothing: the legacy translators only send on
    /// central, and it has no v6 or v7 push. A standalone central never pushes to legacy.
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        let started_before_v3 = config
            .starting_database_version
            .as_ref()
            .is_some_and(|version| *version < Version::from_str("3.0.0"));
        if started_before_v3
            || has_pushed_over_v6_or_v7(connection)?
            || is_standalone_central(connection)?
        {
            return Ok(());
        }

        let Some(site_id) = key_value_int(connection, "SETTINGS_SYNC_SITE_ID")? else {
            // Not initialised, so nothing to re-log
            return Ok(());
        };

        let tables = REPUBLISHED_TABLES
            .iter()
            .map(|table| format!("'{table}'"))
            .collect::<Vec<_>>()
            .join(", ");

        sql!(
            connection,
            r#"
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update,
                source_site_id, transfer_store_id, patient_link_id)
            SELECT c.table_name, c.record_id, c.row_action, c.store_id, c.is_sync_update,
                COALESCE(c.source_site_id, {site_id}),
                c.transfer_store_id, c.patient_link_id
            FROM changelog c
            WHERE c.cursor IN (
                SELECT MAX(latest.cursor) FROM changelog latest
                WHERE latest.table_name IN ({tables})
                GROUP BY latest.table_name, latest.record_id
            )
            ORDER BY c.cursor;
            "#
        )?;

        Ok(())
    }
}

/// Tables central re-publishes to legacy mSupply. Hard-coded so later sync style changes
/// don't change what this does to an older database.
const REPUBLISHED_TABLES: &[&str] = &[
    "vaccine_course",
    "vaccine_course_dose",
    "vaccine_course_item",
    "vaccination",
    "encounter",
];

/// `value_int` for a key_value_store key, null when the key isn't set.
fn key_value_int(connection: &StorageConnection, key: &str) -> anyhow::Result<Option<i32>> {
    // Inline key literal: on Postgres `id` is the `key_type` enum.
    let value = diesel::select(sql::<Nullable<Integer>>(&format!(
        "(SELECT value_int FROM key_value_store WHERE id = '{key}')"
    )))
    .get_result(connection.lock().connection())?;
    Ok(value)
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

/// A standalone central has no v6 or v7 push cursor, so the cursor check doesn't skip it.
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
        migrations::{v2_21_01::V2_21_01, v3_02_00::V3_02_00, v3_04_00::V3_04_00, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*};

    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            row_action -> Text,
            store_id -> Nullable<Text>,
            patient_link_id -> Nullable<Text>,
            source_site_id -> Nullable<Integer>,
        }
    }

    const LEGACY_CENTRAL_SITE_ID: i32 = 1;
    const CENTRAL_SITE_ID: i32 = 5;
    const REMOTE_SITE_ID: i32 = 7;

    fn seed(connection: &StorageConnection, sql: &str) {
        connection.lock().connection().batch_execute(sql).unwrap();
    }

    async fn setup(db_name: &str, version: Version) -> StorageConnection {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(version),
            ..Default::default()
        })
        .await;
        seed(
            &connection,
            &format!(
                "INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_SITE_ID', {CENTRAL_SITE_ID});
                 INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('store_remote_name', 'FACILITY', FALSE, FALSE, 'STR', 'Store remote');
                 INSERT INTO name_link (id, name_id) VALUES ('store_remote_name', 'store_remote_name');
                 INSERT INTO store (id, name_link_id, code, site_id) VALUES
                    ('store_remote', 'store_remote_name', 'STORE_REMOTE', {REMOTE_SITE_ID});"
            ),
        );
        connection
    }

    fn max_cursor(connection: &StorageConnection) -> i64 {
        changelog::table
            .select(diesel::dsl::max(changelog::cursor))
            .first::<Option<i64>>(connection.lock().connection())
            .unwrap()
            .unwrap_or(0)
    }

    #[derive(Debug, PartialEq, Queryable)]
    struct Relogged {
        table_name: String,
        record_id: String,
        row_action: String,
        store_id: Option<String>,
        patient_link_id: Option<String>,
        source_site_id: Option<i32>,
    }

    /// Rows written after `cursor` in the re-published tables
    fn rows_after(connection: &StorageConnection, cursor: i64) -> Vec<Relogged> {
        changelog::table
            .filter(changelog::cursor.gt(cursor))
            .filter(changelog::table_name.eq_any(super::REPUBLISHED_TABLES))
            .order(changelog::cursor)
            .select((
                changelog::table_name,
                changelog::record_id,
                changelog::row_action,
                changelog::store_id,
                changelog::patient_link_id,
                changelog::source_site_id,
            ))
            .load(connection.lock().connection())
            .unwrap()
    }

    /// An upserted row with no patient
    fn row(table: &str, record_id: &str, store_id: Option<&str>, source_site_id: i32) -> Relogged {
        Relogged {
            table_name: table.to_string(),
            record_id: record_id.to_string(),
            row_action: "UPSERT".to_string(),
            store_id: store_id.map(str::to_string),
            patient_link_id: None,
            source_site_id: Some(source_site_id),
        }
    }

    /// A central that has synced on 3.x: every record gets a new row, copied from its
    /// latest one.
    #[actix_rt::test]
    async fn relogs_every_record_on_central_synced_on_3x() {
        let connection = setup(
            "migration_relog_central_records_for_legacy_central_3x",
            V3_02_00.version(),
        )
        .await;
        seed(
            &connection,
            &format!(
                "INSERT INTO changelog (table_name, record_id, row_action, store_id, patient_link_id, is_sync_update, source_site_id) VALUES
                    -- Central's own 2.x row, not stamped in 3.3.1
                    ('vaccine_course', 'course_2x', 'UPSERT', NULL, NULL, FALSE, NULL),
                    -- Edited on 2.x, then on 3.x
                    ('encounter', 'encounter_edited_on_3x', 'UPSERT', NULL, NULL, FALSE, NULL),
                    ('encounter', 'encounter_edited_on_3x', 'UPSERT', NULL, NULL, FALSE, {CENTRAL_SITE_ID}),
                    ('vaccine_course', 'course', 'UPSERT', NULL, NULL, FALSE, {CENTRAL_SITE_ID}),
                    ('vaccination', 'vaccination_from_remote', 'UPSERT', 'store_remote', 'patient', TRUE, {REMOTE_SITE_ID}),
                    ('vaccination', 'vaccination_from_legacy', 'UPSERT', 'store_remote', NULL, TRUE, {LEGACY_CENTRAL_SITE_ID}),
                    ('vaccine_course_dose', 'dose_deleted', 'DELETE', NULL, NULL, FALSE, {CENTRAL_SITE_ID}),
                    -- Not re-published to legacy
                    ('item', 'item', 'UPSERT', NULL, NULL, FALSE, {CENTRAL_SITE_ID});"
            ),
        );
        let before = max_cursor(&connection);

        migrate(
            &connection,
            Some(V3_04_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        assert_eq!(
            rows_after(&connection, before),
            vec![
                row("vaccine_course", "course_2x", None, CENTRAL_SITE_ID),
                row("encounter", "encounter_edited_on_3x", None, CENTRAL_SITE_ID),
                row("vaccine_course", "course", None, CENTRAL_SITE_ID),
                Relogged {
                    patient_link_id: Some("patient".to_string()),
                    ..row(
                        "vaccination",
                        "vaccination_from_remote",
                        Some("store_remote"),
                        REMOTE_SITE_ID
                    )
                },
                row(
                    "vaccination",
                    "vaccination_from_legacy",
                    Some("store_remote"),
                    LEGACY_CENTRAL_SITE_ID
                ),
                Relogged {
                    row_action: "DELETE".to_string(),
                    ..row("vaccine_course_dose", "dose_deleted", None, CENTRAL_SITE_ID)
                },
            ]
        );
    }

    /// A central upgrading from 2.x: the 2.x legacy push never skipped these, so nothing is
    /// re-logged.
    #[actix_rt::test]
    async fn skips_central_upgrading_from_2x() {
        let connection = setup(
            "migration_relog_central_records_for_legacy_central_2x",
            V2_21_01.version(),
        )
        .await;
        seed(
            &connection,
            &format!(
                "INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update, source_site_id) VALUES
                    ('vaccination', 'vaccination_from_remote', 'UPSERT', 'store_remote', TRUE, {REMOTE_SITE_ID}),
                    ('encounter', 'encounter_on_central', 'UPSERT', NULL, FALSE, NULL);"
            ),
        );
        let before = max_cursor(&connection);

        migrate(
            &connection,
            Some(V3_04_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        assert_eq!(rows_after(&connection, before), vec![]);
    }

    /// Remotes have a v6 or v7 push cursor. The row is one the remote received, so the
    /// remote re-log in 3.1.1 leaves it alone too.
    #[actix_rt::test]
    async fn leaves_remotes_alone() {
        for (db_name, cursor_key) in [
            (
                "migration_relog_central_records_for_legacy_central_remote_v7",
                "SYNC_PUSH_CURSOR_V7",
            ),
            (
                "migration_relog_central_records_for_legacy_central_remote_v6",
                "SYNC_PUSH_CURSOR_V6",
            ),
        ] {
            let connection = setup(db_name, V3_02_00.version()).await;
            seed(
                &connection,
                &format!(
                    "INSERT INTO key_value_store (id, value_int) VALUES ('{cursor_key}', 1);
                     INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update, source_site_id) VALUES
                        ('vaccination', 'vaccination', 'UPSERT', 'store_remote', TRUE, {REMOTE_SITE_ID});"
                ),
            );
            let before = max_cursor(&connection);

            migrate(
                &connection,
                Some(V3_04_00.version()),
                MigrationConfig::default(),
            )
            .unwrap();

            assert_eq!(rows_after(&connection, before), vec![], "{db_name}");
        }
    }
}
