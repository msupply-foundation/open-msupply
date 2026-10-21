use crate::{StorageConnection, migrations::*};
use diesel::{
    dsl::sql,
    prelude::*,
    sql_types::{Integer, Nullable},
};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "stamp_central_support_uploads_before_v3"
    }

    /// Stamp central's id on its own 2.x support upload requests, so remotes on v6 pull the
    /// ones they hadn't pulled before central upgraded. `stamp_central_unsent_before_v3`
    /// does this for the other tables central sends over v6.
    ///
    /// Only each request's latest row is stamped, so a request the remote has already
    /// answered isn't sent back to it.
    ///
    /// Only runs on central upgrading from 2.x, detected as that fragment does: no v6 push
    /// cursor, which every 2.x remote has. A central already on 3.x has pulled its remotes'
    /// cursors past these rows, so stamping them sends nothing.
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        let started_on_2x = config
            .starting_database_version
            .as_ref()
            .is_some_and(|version| {
                *version >= Version::from_str("2.0.0") && *version < Version::from_str("3.0.0")
            });
        if !started_on_2x || has_v6_push_cursor(connection)? {
            return Ok(());
        }

        let Some(site_id) = key_value_int(connection, "SETTINGS_SYNC_SITE_ID")? else {
            // Not initialised, so nothing to stamp
            return Ok(());
        };

        // `sync_message.type` holds the JSON-serialised type, quotes included.
        sql!(
            connection,
            r#"
            UPDATE changelog SET source_site_id = {site_id}
            WHERE source_site_id IS NULL
            AND is_sync_update = FALSE
            AND cursor IN (
                SELECT MAX(latest.cursor) FROM changelog latest
                WHERE latest.table_name = 'sync_message'
                GROUP BY latest.record_id
            )
            AND record_id IN (
                SELECT id FROM sync_message WHERE type = '"SupportUpload"'
            );
            "#
        )?;

        Ok(())
    }
}

/// `value_int` for a key_value_store key, null when the key isn't set.
fn key_value_int(connection: &StorageConnection, key: &str) -> anyhow::Result<Option<i32>> {
    // Inline key literal: on Postgres `id` is the `key_type` enum.
    let value = diesel::select(sql::<Nullable<Integer>>(&format!(
        "(SELECT value_int FROM key_value_store WHERE id = '{key}')"
    )))
    .get_result(connection.lock().connection())?;
    Ok(value)
}

/// Whether there's a v6 push cursor. Only remotes write one.
fn has_v6_push_cursor(connection: &StorageConnection) -> anyhow::Result<bool> {
    let cursor_key: Option<i32> = diesel::select(sql::<Nullable<Integer>>(
        "(SELECT 1 FROM key_value_store WHERE id = 'SYNC_PUSH_CURSOR_V6')",
    ))
    .get_result(connection.lock().connection())?;
    Ok(cursor_key.is_some())
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_21_01::V2_21_01, v3_04_00::V3_04_00, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*};

    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            source_site_id -> Nullable<Integer>,
        }
    }

    /// The migration matches the type as the app stores it.
    #[test]
    fn support_upload_type_is_stored_quoted() {
        assert_eq!(
            String::from(crate::SyncMessageRowType::SupportUpload),
            r#""SupportUpload""#
        );
    }

    #[actix_rt::test]
    async fn stamps_latest_central_support_uploads_on_central_upgrading_from_2x() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_stamp_central_support_uploads",
            version: Some(V2_21_01.version()),
            ..Default::default()
        })
        .await;

        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_SITE_ID', 5);
                INSERT INTO sync_message (id, body, created_datetime, status, type) VALUES
                    ('support_unsent', '', '2026-01-01 00:00:00', 'NEW', '"SupportUpload"'),
                    ('support_answered', '', '2026-01-01 00:00:00', 'PROCESSED', '"SupportUpload"'),
                    ('field_change', '', '2026-01-01 00:00:00', 'NEW', '"RequestFieldChange"');
                -- Clear the rows the 2.x changelog trigger wrote
                DELETE FROM changelog;
                INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update, source_site_id) VALUES
                    ('sync_message', 'support_unsent', 'UPSERT', NULL, FALSE, NULL),
                    -- Answered by the remote
                    ('sync_message', 'support_answered', 'UPSERT', NULL, FALSE, NULL),
                    ('sync_message', 'support_answered', 'UPSERT', NULL, TRUE, 6),
                    ('sync_message', 'field_change', 'UPSERT', NULL, FALSE, NULL);
                "#,
            )
            .unwrap();

        migrate(
            &connection,
            Some(V3_04_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        let stamps: Vec<(String, Option<i32>)> = changelog::table
            .filter(changelog::table_name.eq("sync_message"))
            .order(changelog::cursor)
            .select((changelog::record_id, changelog::source_site_id))
            .load(connection.lock().connection())
            .unwrap();
        let expected = [
            ("support_unsent", Some(5)),
            ("support_answered", None),
            ("support_answered", Some(6)),
            ("field_change", None),
        ]
        .map(|(id, source)| (id.to_string(), source));
        assert_eq!(stamps, expected);
    }
}
