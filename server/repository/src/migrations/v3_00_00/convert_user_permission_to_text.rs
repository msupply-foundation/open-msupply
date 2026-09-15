use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "convert_user_permission_to_text"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE user_permission
                        ALTER COLUMN permission TYPE TEXT USING permission::TEXT;
                    DROP TYPE IF EXISTS permission_type;
                "#
            )?;
        }

        Ok(())
    }
}

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use crate::{
        migrations::{v2_18_00::V2_18_00, v3_00_00::V3_00_00, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*, sql_types::Text};

    #[derive(QueryableByName)]
    struct TextValue {
        #[diesel(sql_type = Text)]
        value: String,
    }

    #[actix_rt::test]
    async fn user_permission_type_text_conversion_preserves_values() {
        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_convert_user_permission_to_text",
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Seed FK targets (name → store → user_account) before inserting permissions.
        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('name1', 'STORE', false, false, '', '');
                INSERT INTO name_link (id, name_id) VALUES ('name_link1', 'name1');
                INSERT INTO store (id, name_link_id, site_id, code) VALUES
                    ('store_a', 'name_link1', 1, '');
                INSERT INTO user_account (id, username, hashed_password) VALUES
                    ('user1', 'user1', '');
                INSERT INTO user_permission (id, user_id, store_id, permission) VALUES
                    ('perm1', 'user1', 'store_a', 'STORE_ACCESS'),
                    ('perm2', 'user1', 'store_a', 'SERVER_ADMIN');
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

        let permissions: Vec<String> = diesel::sql_query(
            "SELECT permission AS value FROM user_permission \
             WHERE user_id = 'user1' ORDER BY permission",
        )
        .get_results::<TextValue>(connection.lock().connection())
        .unwrap()
        .into_iter()
        .map(|r| r.value)
        .collect();
        assert_eq!(permissions, vec!["SERVER_ADMIN", "STORE_ACCESS"]);
    }
}
