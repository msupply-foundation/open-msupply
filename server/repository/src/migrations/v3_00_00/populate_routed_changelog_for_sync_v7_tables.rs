use crate::migrations::*;
use diesel::connection::SimpleConnection;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "populate_routed_changelog_for_sync_v7_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Ensure each row in these store-routed tables has a changelog entry carrying its
        // store_id, so sync v7 routes them to the owning store's site instead of broadcasting.
        // Upsert by hand (no unique key on (table_name, record_id) to drive ON CONFLICT):
        // UPDATE fills store_id on a changelog row that already exists; INSERT adds a row
        // for any record that has no changelog row yet.
        const ROUTED_TABLES: &[(&str, &str)] = &[
            ("user_permission", "t.store_id"),
            ("item_store_join", "t.store_id"),
        ];

        let mut sql = String::new();
        for (table, store_expr) in ROUTED_TABLES {
            sql.push_str(&format!(
                "UPDATE changelog \
                 SET store_id = {store_expr} \
                 FROM {table} t \
                 WHERE changelog.table_name = '{table}' \
                     AND changelog.record_id = CAST(t.id AS TEXT) \
                     AND changelog.store_id IS NULL; \
                 INSERT INTO changelog (table_name, record_id, row_action, source_site_id, store_id) \
                 SELECT '{table}', CAST(t.id AS TEXT), 'UPSERT', \
                     COALESCE( \
                         (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID'), \
                         0 \
                     ), \
                     {store_expr} \
                 FROM {table} t \
                 WHERE NOT EXISTS ( \
                     SELECT 1 FROM changelog c \
                     WHERE c.table_name = '{table}' AND c.record_id = CAST(t.id AS TEXT) \
                 );\n"
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

        // Context-bound permission keeps a stable id (the deterministic-id fragment skips
        // it), so we can key on it. Both upsert paths are exercised in sequence after migrating.
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
                INSERT INTO context (id, name) VALUES ('context_x', 'context_x');
                INSERT INTO user_permission (id, user_id, store_id, permission, context_id) VALUES
                    ('perm_x', 'user_x', 'store_x', 'DOCUMENT_QUERY', 'context_x');
                INSERT INTO key_value_store (id, value_int) VALUES
                    ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', 42);
                "#,
            )
            .unwrap();

        migrate(&connection, Some(version.clone()), MigrationConfig::default()).unwrap();
        assert_eq!(get_database_version(&connection), version);

        let load = || {
            changelog::table
                .filter(changelog::table_name.eq("user_permission"))
                .filter(changelog::record_id.eq("perm_x"))
                .select((
                    changelog::row_action,
                    changelog::store_id,
                    changelog::source_site_id,
                ))
                .load::<(String, Option<String>, Option<i32>)>(connection.lock().connection())
                .unwrap()
        };

        // INSERT path: record with no changelog row is seeded with its store_id.
        assert_eq!(
            load(),
            vec![("UPSERT".to_string(), Some("store_x".to_string()), Some(42))],
            "record without a changelog row should get a routed row inserted"
        );

        // UPDATE path: a DB that seeded this row store_id-less (back when these tables were
        // in populate_changelog_with_rows_for_sync_v7_tables); re-running backfills it in
        // place, no duplicate.
        diesel::update(changelog::table.filter(changelog::record_id.eq("perm_x")))
            .set(changelog::store_id.eq(None::<String>))
            .execute(connection.lock().connection())
            .unwrap();

        super::Migrate.migrate(&connection).unwrap();

        assert_eq!(
            load(),
            vec![("UPSERT".to_string(), Some("store_x".to_string()), Some(42))],
            "store_id-less changelog row should be backfilled in place, not duplicated"
        );
    }
}
