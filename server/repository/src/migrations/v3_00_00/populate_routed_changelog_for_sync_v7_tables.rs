use crate::migrations::*;
use diesel::connection::SimpleConnection;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "populate_routed_changelog_for_sync_v7_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Seed store-routed tables' existing rows into the changelog with their store_id,
        // so sync v7 routes them to the owning store's site instead of broadcasting.
        const ROUTED_TABLES: &[(&str, &str)] = &[
            ("user_permission", "t.store_id"),
        ];

        let mut sql = String::new();
        for (table, store_expr) in ROUTED_TABLES {
            sql.push_str(&format!(
                "INSERT INTO changelog (table_name, record_id, row_action, source_site_id, store_id) \
                 SELECT '{table}', CAST(t.id AS TEXT), 'UPSERT', \
                     COALESCE( \
                         (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID'), \
                         0 \
                     ), \
                     {store_expr} \
                 FROM {table} t;\n"
            ));
        }

        connection.lock().connection().batch_execute(&sql)?;
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

    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            row_action -> Text,
            store_id -> Nullable<Text>,
            source_site_id -> Nullable<Integer>,
        }
    }

    #[actix_rt::test]
    async fn test_populate_routed_changelog_for_sync_v7_tables() {
        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_populate_routed_changelog_v7_tables",
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // id is rewritten to a deterministic uuid by an earlier v3 fragment, so assert on store_id.
        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('store_x_name', 'FACILITY', true, false, 'STX', 'Store X');
                INSERT INTO name_link (id, name_id) VALUES ('store_x_name', 'store_x_name');
                INSERT INTO store (id, name_link_id, code, site_id) VALUES
                    ('store_x', 'store_x_name', 'STORE_X', 1);
                INSERT INTO user_account (id, username, hashed_password) VALUES
                    ('user_x', 'user_x', 'hash');
                INSERT INTO user_permission (id, user_id, store_id, permission, context_id) VALUES
                    ('perm_x', 'user_x', 'store_x', 'STORE_ACCESS', NULL);
                INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', 42);
                "#,
            )
            .unwrap();

        migrate(&connection, Some(version.clone()), MigrationConfig::default()).unwrap();
        assert_eq!(get_database_version(&connection), version);

        let perm = changelog::table
            .filter(changelog::table_name.eq("user_permission"))
            .select((
                changelog::row_action,
                changelog::store_id,
                changelog::source_site_id,
            ))
            .load::<(String, Option<String>, Option<i32>)>(connection.lock().connection())
            .unwrap();
        assert_eq!(
            perm,
            vec![("UPSERT".to_string(), Some("store_x".to_string()), Some(42))],
            "user_permission changelog should carry its store_id"
        );
    }
}
