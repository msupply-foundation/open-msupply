use crate::{StorageConnection, migrations::*};
use diesel::{
    dsl::sql,
    prelude::*,
    sql_types::{Nullable, Text},
};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "requeue_plugin_rows_for_upgraded_sites"
    }

    /// Integrate plugin bundles again on a site that stored them before it knew their
    /// runtime, so a site that upgrades loads its form plugins in the new front end.
    ///
    /// Versions before 3.01.1 did not know `frontend_plugin`'s `host_runtime`. They
    /// dropped the field when integrating the row, and the 3.01.1 migration then gave
    /// every bundle `react`, so a bundle built for the new front end is never loaded by
    /// it. The row does not come back by itself: the site's v6 pull cursor is already
    /// past it, and reinstalling an unchanged bundle on central writes nothing. It is
    /// still in the sync buffer with its runtime, so this moves the latest row of each
    /// bundle back to pending, as `v3_00_00::reintegrate_items_for_custom_field_options`
    /// does, and the next v5/v6 sync integrates it with this version's translator. Only
    /// the latest row per bundle: when that is a delete it is applied again, so a bundle
    /// removed after its last upsert stays removed. A row this site already integrated
    /// correctly is written again with the same values.
    ///
    /// Registry entries from OMS central (`document_registry`) need nothing here. A
    /// version without that translator integrates only the tables it knows, so it never
    /// touches those rows and they are still pending when the site reaches 3.4.
    ///
    /// Skipped on a site already on v7, which no longer runs the v5/v6 integration, so
    /// the rows would stay pending for good. On central nothing matches, since central
    /// never pulls bundles.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if is_on_v7(connection)? {
            return Ok(());
        }

        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET is_integrated = FALSE,
                        integration_started_datetime = NULL,
                        integration_datetime = NULL,
                        integration_result = NULL,
                        integration_error = NULL
                    WHERE cursor IN (
                        SELECT MAX(cursor) FROM sync_buffer
                            WHERE table_name = 'frontend_plugin'
                                AND sync_version = 'V5_V6'
                            GROUP BY record_id
                    );
            "#
        )?;

        Ok(())
    }
}

/// Whether `SETTINGS_SYNC_VERSION` says this site syncs over v7. The 3.0 migration
/// `populate_sync_version` recorded it for every database: `V5_V6` for a site that had
/// synced, which is what a 2.x site upgrading straight to 3.4 still has here, and `V7`
/// for a fresh install.
fn is_on_v7(connection: &StorageConnection) -> anyhow::Result<bool> {
    // A scalar subquery so that a missing row reads as null rather than NotFound. The
    // key is an inline literal because on Postgres the id column is the `key_type` enum,
    // which does not compare with a text bind parameter.
    let version: Option<String> = diesel::select(sql::<Nullable<Text>>(
        "(SELECT value_string FROM key_value_store WHERE id = 'SETTINGS_SYNC_VERSION')",
    ))
    .get_result(connection.lock().connection())?;
    Ok(version.as_deref() == Some("V7"))
}

#[cfg(test)]
mod test {
    use crate::{
        migrations::{v3_03_00::V3_03_00, v3_04_00::V3_04_00, *},
        test_db::*,
    };
    use diesel::{RunQueryDsl, prelude::*, sql_query};

    table! {
        sync_buffer (cursor) {
            cursor -> Integer,
            is_integrated -> Bool,
        }
    }

    fn run(connection: &StorageConnection, sql: &str) {
        sql_query(sql)
            .execute(connection.lock().connection())
            .unwrap();
    }

    /// A buffer row from central, either integrated or never touched.
    fn insert_row(
        connection: &StorageConnection,
        cursor: i32,
        table_name: &str,
        record_id: &str,
        action: &str,
        sync_version: &str,
        integrated: bool,
    ) {
        let integration_datetime = if integrated {
            "'2026-01-01 00:00:01'"
        } else {
            "NULL"
        };
        run(
            connection,
            &format!(
                "INSERT INTO sync_buffer (cursor, record_id, received_datetime, integration_datetime, table_name, action, data, sync_version, source_site_id, is_integrated) \
                 VALUES ({cursor}, '{record_id}', '2026-01-01 00:00:00', {integration_datetime}, '{table_name}', '{action}', '{{}}', '{sync_version}', 1, {integrated});"
            ),
        );
    }

    /// What an older v5/v6 site has buffered by the time it upgrades: plugin bundles it
    /// integrated without their runtime, a registry entry it never touched, and rows that
    /// are none of this migration's business.
    fn insert_rows(connection: &StorageConnection) {
        insert_row(
            connection,
            1,
            "frontend_plugin",
            "bundle",
            "UPSERT",
            "V5_V6",
            true,
        );
        insert_row(
            connection,
            2,
            "frontend_plugin",
            "bundle",
            "UPSERT",
            "V5_V6",
            true,
        );
        insert_row(
            connection,
            3,
            "frontend_plugin",
            "removed",
            "UPSERT",
            "V5_V6",
            true,
        );
        insert_row(
            connection,
            4,
            "frontend_plugin",
            "removed",
            "DELETE",
            "V5_V6",
            true,
        );
        insert_row(connection, 5, "item", "item", "UPSERT", "V5_V6", true);
        insert_row(
            connection,
            6,
            "frontend_plugin",
            "bundle_v7",
            "UPSERT",
            "V7",
            true,
        );
        insert_row(
            connection,
            7,
            "document_registry",
            "entry",
            "UPSERT",
            "V5_V6",
            false,
        );
    }

    fn pending(connection: &StorageConnection) -> Vec<i32> {
        sync_buffer::table
            .filter(sync_buffer::is_integrated.eq(false))
            .select(sync_buffer::cursor)
            .order(sync_buffer::cursor)
            .load(connection.lock().connection())
            .unwrap()
    }

    async fn upgrade(db_name: &str, sync_version: &str) -> StorageConnection {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(V3_03_00.version()),
            ..Default::default()
        })
        .await;
        insert_rows(&connection);
        // A fresh test database is recorded as `V7`; set what the site under test has.
        run(
            &connection,
            &format!(
                "UPDATE key_value_store SET value_string = '{sync_version}' WHERE id = 'SETTINGS_SYNC_VERSION';"
            ),
        );

        migrate(
            &connection,
            Some(V3_04_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();
        connection
    }

    /// The latest v5/v6 row of each plugin bundle goes back to pending, the delete
    /// included; earlier rows of the same bundle, other tables and v7 rows stay
    /// integrated. The registry entry was pending all along.
    #[actix_rt::test]
    async fn requeues_the_latest_plugin_rows() {
        let connection = upgrade("migration_requeue_plugin_rows", "V5_V6").await;
        assert_eq!(pending(&connection), vec![2, 4, 7]);
    }

    /// A site on v7 never runs the v5/v6 integration again, so nothing is moved.
    #[actix_rt::test]
    async fn leaves_a_v7_site_alone() {
        let connection = upgrade("migration_requeue_plugin_rows_v7", "V7").await;
        assert_eq!(pending(&connection), vec![7]);
    }
}
