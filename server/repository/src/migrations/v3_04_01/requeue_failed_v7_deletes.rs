use crate::{StorageConnection, migrations::*};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "requeue_failed_v7_deletes"
    }

    /// Integrate again the v7 deletes of `user_store_join` and `plugin_data` that failed
    /// before v7 could apply them (#1949).
    ///
    /// Both tables write delete changelog rows, but the v7 integration had no delete for
    /// them, so a receiving site marked each one integrated with `Delete translator not
    /// found` and kept the row: a user taken off a store could still log in to its v7
    /// site, and plugin data deleted on one site stayed on the others. Integrated rows are
    /// never retried, so this moves them back to pending, as
    /// `requeue_plugin_rows_for_upgraded_sites` does, and the next v7 integration applies
    /// them. A remote integrates them on its next sync; central when the site they came
    /// from next pushes, which every sync does.
    ///
    /// Only a delete that is still the latest buffer row for its record. A record created
    /// again after its delete failed has a newer row, and applying the old delete would
    /// remove it. The latest-wins pass in the integration only looks at pending rows, so
    /// it can't catch that; this does. Both checks are made per record in the one scan,
    /// so only the deletes to requeue are looked up again, and no index is needed: a
    /// 10M-row buffer takes 5-9s on either backend, and building an index first is slower.
    ///
    /// The reference id is cleared, so a delete pulled by an auxiliary sync (a store moved
    /// to this site) is picked up by the main sync rather than waiting on a request that
    /// has finished.
    ///
    /// Every v7 delete of these tables that errored did so for this reason: a row that
    /// fails validation is marked ignored, not errored, and nothing else runs before the
    /// missing delete.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET is_integrated = FALSE,
                        integration_started_datetime = NULL,
                        integration_datetime = NULL,
                        integration_result = NULL,
                        integration_error = NULL,
                        reference_id = NULL
                    WHERE cursor IN (
                        SELECT MAX(cursor) FROM sync_buffer
                            WHERE table_name IN ('user_store_join', 'plugin_data')
                            GROUP BY table_name, record_id
                            HAVING MAX(cursor) = MAX(
                                CASE WHEN action = 'DELETE'
                                        AND sync_version = 'V7'
                                        AND integration_result = 'ERROR'
                                    THEN cursor END
                            )
                    );
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::{
        migrations::{v3_04_00::V3_04_00, v3_04_01::V3_04_01, *},
        test_db::*,
    };
    use diesel::{RunQueryDsl, prelude::*, sql_query};

    table! {
        sync_buffer (cursor) {
            cursor -> Integer,
            is_integrated -> Bool,
            reference_id -> Nullable<Text>,
        }
    }

    fn run(connection: &StorageConnection, sql: &str) {
        sql_query(sql)
            .execute(connection.lock().connection())
            .unwrap();
    }

    /// An integrated buffer row with the given result.
    fn insert_row(
        connection: &StorageConnection,
        cursor: i32,
        (table_name, record_id, action): (&str, &str, &str),
        sync_version: &str,
        result: &str,
        reference_id: Option<&str>,
    ) {
        let reference_id = reference_id
            .map(|id| format!("'{id}'"))
            .unwrap_or("NULL".to_string());
        run(
            connection,
            &format!(
                "INSERT INTO sync_buffer (cursor, record_id, received_datetime, integration_datetime, integration_result, integration_error, table_name, action, data, sync_version, source_site_id, reference_id, is_integrated) \
                 VALUES ({cursor}, '{record_id}', '2026-01-01 00:00:00', '2026-01-01 00:00:01', '{result}', 'error', '{table_name}', '{action}', '{{}}', '{sync_version}', 1, {reference_id}, TRUE);"
            ),
        );
    }

    fn pending(connection: &StorageConnection) -> Vec<(i32, Option<String>)> {
        sync_buffer::table
            .filter(sync_buffer::is_integrated.eq(false))
            .select((sync_buffer::cursor, sync_buffer::reference_id))
            .order(sync_buffer::cursor)
            .load(connection.lock().connection())
            .unwrap()
    }

    /// The failed v7 deletes that are still their record's latest row go back to pending,
    /// with no reference id; everything else stays integrated.
    #[actix_rt::test]
    async fn requeues_failed_v7_deletes() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_requeue_failed_v7_deletes",
            version: Some(V3_04_00.version()),
            ..Default::default()
        })
        .await;

        let usj_delete = |id| ("user_store_join", id, "DELETE");
        let plugin_delete = |id| ("plugin_data", id, "DELETE");
        insert_row(&connection, 1, usj_delete("join"), "V7", "ERROR", None);
        insert_row(
            &connection,
            2,
            plugin_delete("data"),
            "V7",
            "ERROR",
            Some("store_move"),
        );
        // Created again after its delete failed: the delete stays put
        insert_row(&connection, 3, usj_delete("recreated"), "V7", "ERROR", None);
        insert_row(
            &connection,
            4,
            ("user_store_join", "recreated", "UPSERT"),
            "V7",
            "SUCCESS",
            None,
        );
        // Another table, a v5/v6 delete, and a delete that failed validation
        insert_row(
            &connection,
            5,
            ("unit", "unit", "DELETE"),
            "V7",
            "ERROR",
            None,
        );
        insert_row(&connection, 6, plugin_delete("v6"), "V5_V6", "ERROR", None);
        insert_row(
            &connection,
            7,
            plugin_delete("ignored"),
            "V7",
            "IGNORED",
            None,
        );

        migrate(
            &connection,
            Some(V3_04_01.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        assert_eq!(pending(&connection), vec![(1, None), (2, None)]);
    }
}
