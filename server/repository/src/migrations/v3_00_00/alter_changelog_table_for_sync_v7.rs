use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "alter_changelog_table_for_sync_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- View needs to be dropped here as its no longer included in the all_views list
                DROP VIEW IF EXISTS changelog_deduped;

                -- Add transfer_store_id and patient_id to changelog
                ALTER TABLE changelog ADD COLUMN transfer_store_id TEXT;
                ALTER TABLE changelog ADD COLUMN patient_id TEXT;

                -- Create partial indexes on transfer_store_id and patient_id
                CREATE INDEX index_changelog_transfer_store_id ON changelog (transfer_store_id) WHERE transfer_store_id IS NOT NULL;
                CREATE INDEX index_changelog_patient_id ON changelog (patient_id) WHERE patient_id IS NOT NULL;

                -- Drop row_action index
                DROP INDEX IF EXISTS index_changelog_row_action;
            "#
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                -- Convert table_name and row_action from Postgres enums to TEXT (SQLite is already TEXT)
                ALTER TABLE changelog ALTER COLUMN table_name TYPE TEXT USING table_name::TEXT;
                ALTER TABLE changelog ALTER COLUMN row_action TYPE TEXT USING row_action::TEXT;
                DROP TYPE IF EXISTS changelog_table_name;
                DROP TYPE IF EXISTS row_action_type;
            "#
        )?;

        Ok(())
    }
}

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use crate::{
        migrations::{v2_18_00::V2_18_00, v3_00_00::V3_00_00, *},
        test_db::*,
    };
    use diesel::{prelude::*, sql_types::Text};

    #[derive(QueryableByName)]
    struct TextValue {
        #[diesel(sql_type = Text)]
        value: String,
    }

    fn row_action_data_type(connection: &StorageConnection) -> String {
        diesel::sql_query(
            "SELECT data_type AS value FROM information_schema.columns \
             WHERE table_name = 'changelog' AND column_name = 'row_action'",
        )
        .get_result::<TextValue>(connection.lock().connection())
        .unwrap()
        .value
    }

    /// `row_action` enum→TEXT cast must preserve 'UPSERT'/'DELETE' labels.
    #[actix_rt::test]
    async fn alter_changelog_preserves_row_action_case() {
        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_alter_changelog_row_action_case",
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        assert_eq!(row_action_data_type(&connection), "USER-DEFINED");

        // record_ids reference non-existent invoices so downstream v3 fragments
        // (transfer_store_id backfill) skip these rows.
        diesel::sql_query(
            "INSERT INTO changelog (table_name, record_id, row_action) VALUES
                ('invoice', 'case_test_upsert', 'UPSERT'),
                ('invoice', 'case_test_delete', 'DELETE')",
        )
        .execute(connection.lock().connection())
        .unwrap();

        migrate(&connection, Some(version.clone()), MigrationConfig::default()).unwrap();
        assert_eq!(get_database_version(&connection), version);

        assert_eq!(row_action_data_type(&connection), "text");

        let row_actions: Vec<String> = diesel::sql_query(
            "SELECT row_action AS value FROM changelog \
             WHERE record_id IN ('case_test_upsert', 'case_test_delete') \
             ORDER BY record_id",
        )
        .get_results::<TextValue>(connection.lock().connection())
        .unwrap()
        .into_iter()
        .map(|r| r.value)
        .collect();
        assert_eq!(row_actions, vec!["DELETE", "UPSERT"]);
    }
}
