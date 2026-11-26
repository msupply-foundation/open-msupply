use crate::{StorageConnection, migrations::*};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "requeue_failed_v7_central_data_deletes"
    }

    /// Retry the v7 deletes of `item_store_join` and `location_type` that failed on 3.4,
    /// which had no delete for either table. Same query as
    /// `v3_04_01::requeue_failed_v7_deletes`, which explains it.
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
                            WHERE table_name IN ('item_store_join', 'location_type')
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
        migrations::{v3_04_02::V3_04_02, v3_05_00::V3_05_00, *},
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
    async fn requeues_failed_v7_central_data_deletes() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_requeue_failed_v7_central_data_deletes",
            version: Some(V3_04_02.version()),
            ..Default::default()
        })
        .await;

        let join_delete = |id| ("item_store_join", id, "DELETE");
        let type_delete = |id| ("location_type", id, "DELETE");
        insert_row(&connection, 1, join_delete("join"), "V7", "ERROR", None);
        insert_row(
            &connection,
            2,
            type_delete("type"),
            "V7",
            "ERROR",
            Some("store_move"),
        );
        // Created again after its delete failed: the delete stays put
        insert_row(
            &connection,
            3,
            join_delete("recreated"),
            "V7",
            "ERROR",
            None,
        );
        insert_row(
            &connection,
            4,
            ("item_store_join", "recreated", "UPSERT"),
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
        insert_row(&connection, 6, type_delete("v6"), "V5_V6", "ERROR", None);
        insert_row(
            &connection,
            7,
            join_delete("ignored"),
            "V7",
            "IGNORED",
            None,
        );

        migrate(
            &connection,
            Some(V3_05_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        assert_eq!(pending(&connection), vec![(1, None), (2, None)]);
    }
}
