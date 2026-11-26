use crate::migrations::*;

/// Record the admin a standalone central server made at setup, so central data
/// import protects them on servers set up before setup recorded it. Setup gives
/// that admin server-admin permission on the CENTRAL_CONFIG store, and nothing
/// before this version adds other users there. If more than one user has that
/// permission, none is recorded rather than a guess.
///
/// Runs as its own fragment (own transaction) after the key_type enum value is
/// added, so Postgres can use the new enum value.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "record_standalone_central_admin"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO key_value_store (id, value_string)
            SELECT 'STANDALONE_CENTRAL_ADMIN_USER_ID', MIN(user_permission.user_id)
            FROM user_permission
            JOIN store ON store.id = user_permission.store_id
            WHERE store.code = 'CENTRAL_CONFIG'
                AND store.site_id = 1
                AND user_permission.permission = 'SERVER_ADMIN'
                AND EXISTS (
                    SELECT 1 FROM key_value_store
                    WHERE id = 'IS_STANDALONE_CENTRAL' AND value_bool = true
                )
                AND NOT EXISTS (
                    SELECT 1 FROM key_value_store
                    WHERE id = 'STANDALONE_CENTRAL_ADMIN_USER_ID'
                )
            HAVING COUNT(DISTINCT user_permission.user_id) = 1;
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
        connection::SimpleConnection, dsl::sql, prelude::*, sql_types::Nullable, sql_types::Text,
    };

    const SEED: &str = r#"
        INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
            ('central_name', 'STORE', false, false, 'CENTRAL_CONFIG', 'Central'),
            ('other_name', 'STORE', false, false, 'OTHER', 'Other');
        INSERT INTO name_link (id, name_id) VALUES
            ('central_name', 'central_name'),
            ('other_name', 'other_name');
        INSERT INTO store (id, name_link_id, site_id, code) VALUES
            ('central', 'central_name', 1, 'CENTRAL_CONFIG'),
            ('other', 'other_name', 1, 'OTHER');
        INSERT INTO user_account (id, username, hashed_password) VALUES
            ('admin', 'admin', ''),
            ('clerk', 'clerk', ''),
            ('other_admin', 'other_admin', '');
        INSERT INTO user_permission (id, user_id, store_id, permission) VALUES
            ('p1', 'admin', 'central', 'SERVER_ADMIN'),
            ('p2', 'admin', 'central', 'STORE_ACCESS'),
            ('p3', 'clerk', 'central', 'STORE_ACCESS'),
            ('p4', 'other_admin', 'other', 'SERVER_ADMIN');
    "#;

    async fn recorded_admin(db_name: &str, seed: &str) -> Option<String> {
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

        diesel::select(sql::<Nullable<Text>>(
            "(SELECT value_string FROM key_value_store \
                WHERE id = 'STANDALONE_CENTRAL_ADMIN_USER_ID')",
        ))
        .get_result(connection.lock().connection())
        .unwrap()
    }

    #[actix_rt::test]
    async fn records_the_setup_admin_of_a_standalone_central() {
        let standalone = format!(
            "{SEED} INSERT INTO key_value_store (id, value_bool) VALUES ('IS_STANDALONE_CENTRAL', true);"
        );
        assert_eq!(
            recorded_admin("migration_record_standalone_central_admin", &standalone).await,
            Some("admin".to_string())
        );
    }

    #[actix_rt::test]
    async fn records_no_admin_when_it_cannot_tell_which() {
        assert_eq!(
            recorded_admin(
                "migration_record_standalone_central_admin_not_standalone",
                SEED
            )
            .await,
            None,
            "not a standalone central"
        );

        let two_admins = format!(
            "{SEED} INSERT INTO key_value_store (id, value_bool) VALUES ('IS_STANDALONE_CENTRAL', true);
            INSERT INTO user_permission (id, user_id, store_id, permission) VALUES
                ('p5', 'clerk', 'central', 'SERVER_ADMIN');"
        );
        assert_eq!(
            recorded_admin("migration_record_standalone_central_admin_two", &two_admins).await,
            None,
            "two users have server admin on the setup store"
        );
    }
}
