use crate::migrations::*;

/// Moves every site but a standalone central's own to V7: there is no legacy central to upgrade a
/// V5_V6 site. No changelog, as sites sync only to a legacy central.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "move_standalone_central_sites_to_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            UPDATE site SET sync_version = 'V7'
            WHERE sync_version <> 'V7'
                AND id NOT IN (
                    SELECT value_int FROM key_value_store
                    WHERE id = 'SETTINGS_SYNC_SITE_ID' AND value_int IS NOT NULL
                )
                AND EXISTS (
                    SELECT 1 FROM key_value_store
                    WHERE id = 'IS_STANDALONE_CENTRAL' AND value_bool = true
                );
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v3_04_01::V3_04_01, v3_05_00::V3_05_00, *},
        test_db::*,
    };
    use diesel::{
        connection::SimpleConnection,
        prelude::*,
        sql_query,
        sql_types::{Integer, Text},
    };

    const SEED: &str = r#"
        INSERT INTO site (id, code, name, hashed_password, sync_version) VALUES
            (1, 'central', 'Central', '', 'V5_V6'),
            (2, 'legacy', 'Legacy', '', 'V5_V6'),
            (3, 'current', 'Current', '', 'V7');
        INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_SITE_ID', 1);
    "#;

    #[derive(QueryableByName)]
    struct Site {
        #[diesel(sql_type = Integer)]
        id: i32,
        #[diesel(sql_type = Text)]
        sync_version: String,
    }

    async fn sync_versions(db_name: &str, seed: &str) -> Vec<(i32, String)> {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(V3_04_01.version()),
            ..Default::default()
        })
        .await;
        connection.lock().connection().batch_execute(seed).unwrap();

        migrate(
            &connection,
            Some(V3_05_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        sql_query("SELECT id, sync_version FROM site ORDER BY id")
            .load::<Site>(connection.lock().connection())
            .unwrap()
            .into_iter()
            .map(|site| (site.id, site.sync_version))
            .collect()
    }

    #[actix_rt::test]
    async fn moves_a_standalone_centrals_sites_to_v7() {
        // OMS-FUN-SYC-002.43
        let standalone = format!(
            "{SEED} INSERT INTO key_value_store (id, value_bool) VALUES ('IS_STANDALONE_CENTRAL', true);"
        );
        assert_eq!(
            sync_versions("migration_move_standalone_central_sites_to_v7", &standalone).await,
            vec![
                (1, "V5_V6".to_string()),
                (2, "V7".to_string()),
                (3, "V7".to_string()),
            ],
            "every site but central's own"
        );
    }

    #[actix_rt::test]
    async fn leaves_the_sites_of_a_central_with_a_legacy_central_above() {
        assert_eq!(
            sync_versions("migration_move_standalone_central_sites_to_v7_mixed", SEED).await,
            vec![
                (1, "V5_V6".to_string()),
                (2, "V5_V6".to_string()),
                (3, "V7".to_string()),
            ],
            "the legacy central upgrades them"
        );
    }
}
