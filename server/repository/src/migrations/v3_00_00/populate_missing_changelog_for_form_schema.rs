use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "populate_missing_changelog_for_form_schema"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // form_schema predates changelog support for it (added in v2_06_00), so schemas
        // integrated before then and not edited since have no changelog row. Under v5/v6 they
        // still reached remotes via the remote's own pull from legacy central; v7 only pulls
        // from OMS central via the changelog, so those schemas are never distributed and
        // patient documents referencing them fail to integrate.
        //
        // Not added to populate_changelog_with_rows_for_sync_v7_tables because that fragment
        // has already run in the field; this one is guarded by NOT EXISTS so it is safe to
        // run on a database that already has changelog rows for form_schema (there's no unique
        // key on (table_name, record_id) to drive ON CONFLICT).
        //
        // source_site_id mirrors the other v7 backfills: the central server's site_id from
        // key_value_store, falling back to 0 (OMS-Central convention) when the key isn't set.
        // These rows are legacy-sourced, so stamping them with the central site id also keeps
        // them from being pushed back out by the edited-on-this-site push filters.
        sql!(
            connection,
            r#"
            INSERT INTO changelog (table_name, record_id, row_action, source_site_id)
            SELECT 'form_schema', t.id, 'UPSERT',
                COALESCE(
                    (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID'),
                    0
                )
            FROM form_schema t
            WHERE NOT EXISTS (
                SELECT 1 FROM changelog c
                WHERE c.table_name = 'form_schema' AND c.record_id = t.id
            );
            "#
        )?;

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

    #[actix_rt::test]
    async fn test_populate_missing_changelog_for_form_schema() {
        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_populate_missing_changelog_for_form_schema",
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Two schemas of the shape a pre-v2.7 database holds: rows with no changelog entry.
        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                INSERT INTO form_schema (id, type, json_schema, ui_schema) VALUES
                    ('schema1', 'Patient', '{}', '{}'),
                    ('schema2', 'ProgramEnrolment', '{}', '{}');
                INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', 42);
                "#,
            )
            .unwrap();

        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(&connection), version);

        let count_for = |record_id: &str| -> i64 {
            changelog::table
                .filter(changelog::table_name.eq("form_schema"))
                .filter(changelog::record_id.eq(record_id))
                .count()
                .get_result::<i64>(connection.lock().connection())
                .unwrap()
        };

        assert_eq!(count_for("schema1"), 1);
        assert_eq!(count_for("schema2"), 1);

        // Verify the backfilled row's shape: row_action='UPSERT', source_site_id from the
        // seeded central site id (42), and the routing columns NULL (a keyless central row).
        let row = changelog::table
            .filter(changelog::table_name.eq("form_schema"))
            .filter(changelog::record_id.eq("schema1"))
            .select((
                changelog::row_action,
                changelog::store_id,
                changelog::source_site_id,
                changelog::transfer_store_id,
                changelog::patient_link_id,
            ))
            .first::<(
                String,
                Option<String>,
                Option<i32>,
                Option<String>,
                Option<String>,
            )>(connection.lock().connection())
            .unwrap();
        assert_eq!(
            row,
            ("UPSERT".to_string(), None, Some(42), None, None),
            "expected ('UPSERT', NULL, Some(42), NULL, NULL) for form_schema/schema1"
        );

        // Re-running must not duplicate: schemas that already have a changelog row are skipped.
        super::Migrate.migrate(&connection).unwrap();

        assert_eq!(
            count_for("schema1"),
            1,
            "schema with an existing changelog row should not get a second one"
        );
        assert_eq!(
            count_for("schema2"),
            1,
            "schema with an existing changelog row should not get a second one"
        );
    }
}
