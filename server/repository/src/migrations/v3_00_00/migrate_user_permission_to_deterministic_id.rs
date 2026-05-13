use crate::db_diesel::user_permission_row::UserPermissionRow;
use crate::migrations::*;
use diesel::prelude::*;
use diesel::sql_types::{Nullable, Text};

/// Rewrite `user_permission.id` for non-context-bound rows to the deterministic
/// UUID v5 derived from `(user_id, store_id, permission)`.
///
/// Before sync v7, these ids were generated locally (uuid v7) at sync-translation
/// or login time, so the same logical permission ended up with different ids on
/// the central server and each remote. Sync v7 has no translation layer — the
/// central server pushes rows by id and remotes must match. This fragment brings
/// existing rows in line with the deterministic ids the runtime now produces.
///
/// Context-bound permissions (`context_id IS NOT NULL`) are synced from
/// `om_user_permission` using the legacy OG id and are left untouched here.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "migrate_user_permission_to_deterministic_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Read `permission` as TEXT so we don't have to map the Postgres enum
        // type into the live Rust `PermissionType`, which may evolve later.
        let select_sql = if cfg!(feature = "postgres") {
            "SELECT id, user_id, store_id, permission::text AS permission \
             FROM user_permission \
             WHERE context_id IS NULL"
        } else {
            "SELECT id, user_id, store_id, permission \
             FROM user_permission \
             WHERE context_id IS NULL"
        };

        let rows: Vec<UserPermissionIdRow> = diesel::sql_query(select_sql)
            .load(connection.lock().connection())?;

        for row in rows {
            let new_id = UserPermissionRow::deterministic_id_from_db_form(
                &row.user_id,
                row.store_id.as_deref(),
                &row.permission,
            );
            if new_id == row.id {
                continue;
            }
            diesel::sql_query(
                "UPDATE user_permission SET id = $1 WHERE id = $2",
            )
            .bind::<Text, _>(&new_id)
            .bind::<Text, _>(&row.id)
            .execute(connection.lock().connection())?;

            // No changelog rewrite: `user_permission` only became a changelog
            // table on the sync-v7 feature branch, so no v2.x DB has changelog
            // entries pointing at the old ids. The populate_changelog fragment
            // that runs after this one will produce the fresh v7 entries with
            // the new ids.
        }

        Ok(())
    }
}

#[derive(QueryableByName)]
struct UserPermissionIdRow {
    #[diesel(sql_type = Text)]
    id: String,
    #[diesel(sql_type = Text)]
    user_id: String,
    #[diesel(sql_type = Nullable<Text>)]
    store_id: Option<String>,
    #[diesel(sql_type = Text)]
    permission: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::migrations::v2_18_00::V2_18_00;
    use crate::migrations::v3_00_00::V3_00_00;
    use crate::test_db::*;
    use diesel::connection::SimpleConnection;

    table! {
        user_permission (id) {
            id -> Text,
        }
    }

    #[actix_rt::test]
    async fn migrates_only_non_context_bound_rows() {
        let previous_version = V2_18_00.version();
        let version = V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_user_permission_deterministic_id",
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Seed: user_account + store + name (FK targets) and three user_permission rows.
        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('name_s', 'STORE', false, false, '', '');
                INSERT INTO name_link (id, name_id) VALUES ('name_link_s', 'name_s');
                INSERT INTO store (id, name_link_id, site_id, code) VALUES
                    ('store_a', 'name_link_s', 1, '');
                INSERT INTO user_account (id, username, hashed_password) VALUES
                    ('user_a', 'user_a', '');
                INSERT INTO context (id, name) VALUES ('context_x', 'context_x');

                -- random v7-style id, no context → must be rewritten
                INSERT INTO user_permission (id, user_id, store_id, permission, context_id)
                VALUES ('old_random_1', 'user_a', 'store_a', 'STORE_ACCESS', NULL);

                -- another non-context-bound row → must be rewritten
                INSERT INTO user_permission (id, user_id, store_id, permission, context_id)
                VALUES ('old_random_2', 'user_a', 'store_a', 'STOCK_LINE_QUERY', NULL);

                -- context-bound → must be left alone
                INSERT INTO user_permission (id, user_id, store_id, permission, context_id)
                VALUES ('og_id_keep', 'user_a', 'store_a', 'DOCUMENT_QUERY', 'context_x');
                "#,
            )
            .unwrap();

        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);

        let ids: Vec<String> = user_permission::table
            .select(user_permission::id)
            .order(user_permission::id.asc())
            .load(connection.lock().connection())
            .unwrap();

        let expected_1 = UserPermissionRow::deterministic_id_from_db_form(
            "user_a",
            Some("store_a"),
            "STORE_ACCESS",
        );
        let expected_2 = UserPermissionRow::deterministic_id_from_db_form(
            "user_a",
            Some("store_a"),
            "STOCK_LINE_QUERY",
        );

        assert!(ids.contains(&expected_1), "missing rewritten StoreAccess id");
        assert!(
            ids.contains(&expected_2),
            "missing rewritten StockLineQuery id"
        );
        assert!(
            ids.contains(&"og_id_keep".to_string()),
            "context-bound row should not be rewritten"
        );
        assert!(
            !ids.contains(&"old_random_1".to_string())
                && !ids.contains(&"old_random_2".to_string()),
            "old non-context-bound ids should be gone"
        );
    }
}
