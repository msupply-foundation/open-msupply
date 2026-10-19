use crate::{StorageConnection, migrations::*};
use diesel::{
    dsl::sql,
    prelude::*,
    sql_types::{Integer, Nullable, Text},
};

// Local copies of the columns used, as in the 3.4.0 schema
table! {
    name_store_join (id) {
        id -> Text,
        inactive -> Bool,
    }
}

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

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "inactivate_kept_name_store_joins"
    }

    /// Before 3.4, central kept a patient join active when OG deleted it while the
    /// patient had prescriptions in the store (#12365). Set those joins inactive.
    ///
    /// Changelog rows are stamped with OG's site id so the store's site pulls them and
    /// they aren't pushed back to OG.
    ///
    /// Central only: skip sites that have pushed over v6/v7 or started below 2.0.
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        let started_before_v6 = config
            .starting_database_version
            .as_ref()
            .is_some_and(|version| *version < Version::from_str("2.0.0"));
        if started_before_v6 || has_pushed_over_v6_or_v7(connection)? {
            return Ok(());
        }

        let Some(og_site_id) = key_value_int(connection, "SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID")?
        else {
            return Ok(());
        };

        let kept_joins: Vec<KeptJoin> =
            diesel::sql_query(kept_joins_query(og_site_id)).load(connection.lock().connection())?;

        // Chunked to stay under SQLite's bind parameter limit
        for chunk in kept_joins.chunks(500) {
            diesel::update(name_store_join::table)
                .filter(name_store_join::id.eq_any(chunk.iter().map(|join| &join.id)))
                .set(name_store_join::inactive.eq(true))
                .execute(connection.lock().connection())?;

            let changelog_rows: Vec<_> = chunk
                .iter()
                .map(|join| {
                    (
                        changelog::table_name.eq("name_store_join"),
                        changelog::record_id.eq(&join.id),
                        changelog::row_action.eq("UPSERT"),
                        changelog::store_id.eq(Some(&join.store_id)),
                        changelog::source_site_id.eq(Some(og_site_id)),
                    )
                })
                .collect();
            diesel::insert_into(changelog::table)
                .values(changelog_rows)
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}

#[derive(QueryableByName)]
struct KeptJoin {
    #[diesel(sql_type = Text)]
    id: String,
    #[diesel(sql_type = Text)]
    store_id: String,
}

/// Active patient joins whose latest sync_buffer row from OG is a delete or an inactive
/// upsert.
fn kept_joins_query(og_site_id: i32) -> String {
    let is_inactive = if cfg!(feature = "postgres") {
        "(sb.data::jsonb ->> 'inactive') = 'true'"
    } else {
        "json_extract(sb.data, '$.inactive') = 1"
    };

    format!(
        r#"
        WITH latest AS (
            SELECT record_id, MAX(cursor) AS cursor
            FROM sync_buffer
            WHERE table_name = 'name_store_join' AND source_site_id = {og_site_id}
            GROUP BY record_id
        )
        SELECT nsj.id, nsj.store_id
        FROM name_store_join nsj
        JOIN name_link nl ON nl.id = nsj.name_link_id
        JOIN name n ON n.id = nl.name_id
        JOIN latest ON latest.record_id = nsj.id
        JOIN sync_buffer sb ON sb.cursor = latest.cursor
        WHERE nsj.inactive = FALSE
          AND n.type = 'PATIENT'
          AND CASE
                WHEN sb.action = 'DELETE' THEN TRUE
                WHEN sb.action = 'UPSERT' THEN {is_inactive}
                ELSE FALSE
              END
        "#
    )
}

fn key_value_int(connection: &StorageConnection, key: &str) -> anyhow::Result<Option<i32>> {
    // Key inlined: on Postgres the id column is an enum, which doesn't take a text bind
    let value = diesel::select(sql::<Nullable<Integer>>(&format!(
        "(SELECT value_int FROM key_value_store WHERE id = '{key}')"
    )))
    .get_result(connection.lock().connection())?;
    Ok(value)
}

/// Only remotes write a push cursor
fn has_pushed_over_v6_or_v7(connection: &StorageConnection) -> anyhow::Result<bool> {
    let cursor_key: Option<i32> = diesel::select(sql::<Nullable<Integer>>(
        "(SELECT 1 FROM key_value_store \
            WHERE id IN ('SYNC_PUSH_CURSOR_V6', 'SYNC_PUSH_CURSOR_V7') LIMIT 1)",
    ))
    .get_result(connection.lock().connection())?;
    Ok(cursor_key.is_some())
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v3_03_01::V3_03_01, v3_04_00::V3_04_00, *},
        test_db::*,
    };
    use diesel::{connection::SimpleConnection, prelude::*};

    use super::{changelog, name_store_join};

    const OG_SITE_ID: i32 = 1;

    const SEED: &str = r#"
        INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
            ('store_name', 'STORE', false, false, 'S', 'Store'),
            ('patient', 'PATIENT', true, false, 'P', 'Patient'),
            ('facility', 'FACILITY', true, false, 'F', 'Facility');
        INSERT INTO name_link (id, name_id) VALUES
            ('store_name', 'store_name'),
            ('patient', 'patient'),
            ('facility', 'facility');
        INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store', 'store_name', 'S', 3);

        INSERT INTO name_store_join (id, name_link_id, store_id, name_is_customer, name_is_supplier) VALUES
            ('kept_by_delete', 'patient', 'store', true, false),
            ('kept_by_inactive', 'patient', 'store', true, false),
            ('recreated_by_og', 'patient', 'store', true, false),
            ('never_deleted', 'patient', 'store', true, false),
            ('no_buffer_row', 'patient', 'store', true, false),
            ('facility_kept', 'facility', 'store', true, false);

        INSERT INTO sync_buffer (record_id, received_datetime, table_name, action, data, source_site_id) VALUES
            ('kept_by_delete', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                '{"ID":"kept_by_delete","name_ID":"patient","store_ID":"store","inactive":false}', 1),
            ('kept_by_delete', '2025-01-02 00:00:00', 'name_store_join', 'DELETE', 'null', 1),
            -- Pushed by a v7 site after OG's delete
            ('kept_by_delete', '2025-01-03 00:00:00', 'name_store_join', 'UPSERT',
                '{"id":"kept_by_delete","name_id":"patient","store_id":"store"}', 5),
            ('kept_by_inactive', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                '{"ID":"kept_by_inactive","name_ID":"patient","store_ID":"store","inactive":false}', 1),
            ('kept_by_inactive', '2025-01-02 00:00:00', 'name_store_join', 'UPSERT',
                '{"ID":"kept_by_inactive","name_ID":"patient","store_ID":"store","inactive":true}', 1),
            -- Latest row is active
            ('recreated_by_og', '2025-01-01 00:00:00', 'name_store_join', 'DELETE', 'null', 1),
            ('recreated_by_og', '2025-01-02 00:00:00', 'name_store_join', 'UPSERT',
                '{"ID":"recreated_by_og","name_ID":"patient","store_ID":"store","inactive":false}', 1),
            ('never_deleted', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                '{"ID":"never_deleted","name_ID":"patient","store_ID":"store","inactive":false}', 1),
            -- Other table
            ('no_buffer_row', '2025-01-02 00:00:00', 'transact', 'DELETE', 'null', 1),
            -- Not a patient
            ('facility_kept', '2025-01-02 00:00:00', 'name_store_join', 'DELETE', 'null', 1);
    "#;

    /// (table_name, record_id, row_action, store_id, source_site_id)
    type ChangelogSummary = (String, String, String, Option<String>, Option<i32>);

    async fn setup(db_name: &str, key_values: &str) -> StorageConnection {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(V3_03_01.version()),
            ..Default::default()
        })
        .await;
        let seed = format!("{key_values}{SEED}");
        connection.lock().connection().batch_execute(&seed).unwrap();
        connection
    }

    fn run(connection: &StorageConnection) {
        migrate(
            connection,
            Some(V3_04_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();
    }

    fn inactive_joins(connection: &StorageConnection) -> Vec<String> {
        name_store_join::table
            .filter(name_store_join::inactive.eq(true))
            .order(name_store_join::id)
            .select(name_store_join::id)
            .load(connection.lock().connection())
            .unwrap()
    }

    fn changelog_after(connection: &StorageConnection, cursor: i64) -> Vec<ChangelogSummary> {
        changelog::table
            .filter(changelog::cursor.gt(cursor))
            .order(changelog::record_id)
            .select((
                changelog::table_name,
                changelog::record_id,
                changelog::row_action,
                changelog::store_id,
                changelog::source_site_id,
            ))
            .load(connection.lock().connection())
            .unwrap()
    }

    fn max_cursor(connection: &StorageConnection) -> i64 {
        changelog::table
            .select(diesel::dsl::max(changelog::cursor))
            .first::<Option<i64>>(connection.lock().connection())
            .unwrap()
            .unwrap_or(0)
    }

    fn central_key_values() -> String {
        format!(
            "INSERT INTO key_value_store (id, value_int) VALUES
                ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', {OG_SITE_ID});"
        )
    }

    #[actix_rt::test]
    async fn inactivates_kept_patient_joins_on_central() {
        let connection = setup(
            "migration_inactivate_kept_name_store_joins",
            &central_key_values(),
        )
        .await;
        let before = max_cursor(&connection);

        run(&connection);

        assert_eq!(
            inactive_joins(&connection),
            vec!["kept_by_delete".to_string(), "kept_by_inactive".to_string()]
        );
        let og_sourced = |id: &str| {
            (
                "name_store_join".to_string(),
                id.to_string(),
                "UPSERT".to_string(),
                Some("store".to_string()),
                Some(OG_SITE_ID),
            )
        };
        assert_eq!(
            changelog_after(&connection, before),
            vec![og_sourced("kept_by_delete"), og_sourced("kept_by_inactive")]
        );

        // Second run changes nothing
        let before_second = max_cursor(&connection);
        super::Migrate
            .migrate_with_config(&connection, &MigrationConfig::default())
            .unwrap();
        assert_eq!(changelog_after(&connection, before_second), vec![]);
    }

    #[actix_rt::test]
    async fn skips_remote() {
        let connection = setup(
            "migration_inactivate_kept_name_store_joins_remote",
            &format!(
                "{}INSERT INTO key_value_store (id, value_int) VALUES ('SYNC_PUSH_CURSOR_V7', 100);",
                central_key_values()
            ),
        )
        .await;
        let before = max_cursor(&connection);

        run(&connection);

        assert_eq!(inactive_joins(&connection), Vec::<String>::new());
        assert_eq!(changelog_after(&connection, before), vec![]);
    }

    #[actix_rt::test]
    async fn skips_without_og_site_id() {
        let connection = setup("migration_inactivate_kept_name_store_joins_no_og", "").await;
        let before = max_cursor(&connection);

        run(&connection);

        assert_eq!(inactive_joins(&connection), Vec::<String>::new());
        assert_eq!(changelog_after(&connection, before), vec![]);
    }
}
