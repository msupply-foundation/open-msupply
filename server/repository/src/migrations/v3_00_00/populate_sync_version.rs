use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "populate_sync_version"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Existing remotes (have sync url stored) keep V5_V6 for one last sync;
        // fresh installs default to V7.
        sql!(
            connection,
            r#"
                INSERT INTO key_value_store (id, value_string)
                VALUES (
                    'SETTINGS_SYNC_VERSION',
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM key_value_store
                            WHERE id = 'SETTINGS_SYNC_URL' AND value_string IS NOT NULL
                        )
                        THEN 'V5_V6'
                        ELSE 'V7'
                    END
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
    use diesel::{sql_query, sql_types::Text, RunQueryDsl};

    #[derive(diesel::QueryableByName, Debug)]
    struct StringResult {
        #[diesel(sql_type = Text)]
        value_string: String,
    }

    async fn run_migration_with_optional_sync_url(seed_sync_url: bool) -> Option<String> {
        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let db_name = format!(
            "migration_populate_sync_version_{}_{}",
            version,
            if seed_sync_url { "existing" } else { "fresh" }
        );

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &db_name,
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        if seed_sync_url {
            sql_query(
                "INSERT INTO key_value_store (id, value_string) VALUES ('SETTINGS_SYNC_URL', 'http://localhost:8008');"
            )
            .execute(connection.lock().connection())
            .unwrap();
        }

        migrate(
            &connection,
            Some(version.clone()),
            crate::migrations::MigrationConfig::default(),
        )
        .unwrap();

        let result: Vec<StringResult> = sql_query(
            "SELECT value_string FROM key_value_store WHERE id = 'SETTINGS_SYNC_VERSION';",
        )
        .load(connection.lock().connection())
        .unwrap();

        result.into_iter().next().map(|r| r.value_string)
    }

    #[actix_rt::test]
    async fn populate_sync_version_existing_install_defaults_to_v5v6() {
        let value = run_migration_with_optional_sync_url(true).await;
        assert_eq!(value, Some("V5_V6".to_string()));
    }

    #[actix_rt::test]
    async fn populate_sync_version_fresh_install_defaults_to_v7() {
        let value = run_migration_with_optional_sync_url(false).await;
        assert_eq!(value, Some("V7".to_string()));
    }
}
