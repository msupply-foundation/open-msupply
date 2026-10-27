use crate::{StorageConnection, migrations::*};
use diesel::{
    dsl::sql,
    prelude::*,
    sql_types::{Bool, Integer, Nullable, Text},
};
use std::collections::BTreeSet;

// Local copies of the columns used, as in the 3.4.0 schema
table! {
    name_store_join (id) {
        id -> Text,
        name_link_id -> Text,
        store_id -> Text,
        name_is_customer -> Bool,
        name_is_supplier -> Bool,
        visible -> Bool,
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
        patient_link_id -> Nullable<Text>,
    }
}

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "recreate_joins_for_deleted_patients"
    }

    /// Joins OG sent for a deleted patient that no longer exist are recreated not
    /// visible from OG's sync_buffer rows, and the patient is logged again so the
    /// deletion reaches the stores' sites through them.
    ///
    /// Changelog rows are stamped with OG's site id so the sites pull them and they
    /// aren't pushed back to OG.
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

        let sent_joins: Vec<SentJoin> =
            diesel::sql_query(sent_joins_query(og_site_id)).load(connection.lock().connection())?;

        // One join per patient and store, the latest OG sent
        let mut seen = BTreeSet::new();
        let joins: Vec<SentJoin> = sent_joins
            .into_iter()
            .filter(|join| seen.insert((join.name_id.clone(), join.store_id.clone())))
            .collect();

        // Chunked to stay under SQLite's bind parameter limit
        for chunk in joins.chunks(500) {
            let join_rows: Vec<_> = chunk
                .iter()
                .map(|join| {
                    (
                        name_store_join::id.eq(&join.id),
                        name_store_join::name_link_id.eq(&join.name_link_id),
                        name_store_join::store_id.eq(&join.store_id),
                        name_store_join::name_is_customer.eq(join.is_customer),
                        name_store_join::name_is_supplier.eq(join.is_supplier),
                        name_store_join::visible.eq(false),
                    )
                })
                .collect();
            diesel::insert_into(name_store_join::table)
                .values(join_rows)
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

        // After the joins, so the patient routes through them
        let patient_ids: Vec<&String> = joins
            .iter()
            .map(|join| &join.name_id)
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
        for chunk in patient_ids.chunks(500) {
            let changelog_rows: Vec<_> = chunk
                .iter()
                .map(|patient_id| {
                    (
                        changelog::table_name.eq("name"),
                        changelog::record_id.eq(*patient_id),
                        changelog::row_action.eq("UPSERT"),
                        changelog::source_site_id.eq(Some(og_site_id)),
                        changelog::patient_link_id.eq(Some(*patient_id)),
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
struct SentJoin {
    #[diesel(sql_type = Text)]
    id: String,
    #[diesel(sql_type = Text)]
    name_link_id: String,
    #[diesel(sql_type = Text)]
    store_id: String,
    #[diesel(sql_type = Text)]
    name_id: String,
    #[diesel(sql_type = Bool)]
    is_customer: bool,
    #[diesel(sql_type = Bool)]
    is_supplier: bool,
}

/// Joins OG sent for deleted patients, where the patient now has no join for that
/// store. Latest first.
fn sent_joins_query(og_site_id: i32) -> String {
    let (name_id, store_id) = if cfg!(feature = "postgres") {
        (
            "sb.data::jsonb ->> 'name_ID'",
            "sb.data::jsonb ->> 'store_ID'",
        )
    } else {
        (
            "json_extract(sb.data, '$.name_ID')",
            "json_extract(sb.data, '$.store_ID')",
        )
    };

    format!(
        r#"
        WITH latest AS (
            SELECT record_id, MAX(cursor) AS cursor
            FROM sync_buffer
            WHERE table_name = 'name_store_join' AND action = 'UPSERT'
              AND source_site_id = {og_site_id}
            GROUP BY record_id
        ),
        sent AS (
            SELECT sb.record_id AS id, {name_id} AS name_link_id, {store_id} AS store_id,
                sb.cursor
            FROM latest
            JOIN sync_buffer sb ON sb.cursor = latest.cursor
        )
        SELECT sent.id, sent.name_link_id, sent.store_id, n.id AS name_id,
            n.is_customer, n.is_supplier
        FROM sent
        JOIN name_link nl ON nl.id = sent.name_link_id
        JOIN name n ON n.id = nl.name_id
        JOIN store ON store.id = sent.store_id
        WHERE n.type = 'PATIENT'
          AND n.deleted_datetime IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM name_store_join nsj WHERE nsj.id = sent.id)
          AND NOT EXISTS (
            SELECT 1 FROM name_store_join nsj
            JOIN name_link l ON l.id = nsj.name_link_id
            WHERE l.name_id = n.id AND nsj.store_id = sent.store_id
          )
        ORDER BY sent.cursor DESC
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

    #[actix_rt::test]
    async fn migration_recreate_joins_for_deleted_patients() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_recreate_joins_for_deleted_patients",
            version: Some(V3_03_01.version()),
            ..Default::default()
        })
        .await;

        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', 1);
                INSERT INTO name (id, type, is_customer, is_supplier, code, name, deleted_datetime) VALUES
                    ('store_a_name', 'STORE', false, false, 'A', 'Store A', NULL),
                    ('store_b_name', 'STORE', false, false, 'B', 'Store B', NULL),
                    ('patient', 'PATIENT', true, false, 'P', 'Patient', '2025-02-01 00:00:00');
                INSERT INTO name_link (id, name_id) VALUES
                    ('store_a_name', 'store_a_name'), ('store_b_name', 'store_b_name'), ('patient', 'patient');
                INSERT INTO store (id, name_link_id, code, site_id) VALUES
                    ('store_a', 'store_a_name', 'A', 3),
                    ('store_b', 'store_b_name', 'B', 4);
                -- Kept for prescriptions, so not recreated
                INSERT INTO name_store_join (id, name_link_id, store_id, name_is_customer, name_is_supplier) VALUES
                    ('join_a', 'patient', 'store_a', true, false);
                INSERT INTO sync_buffer (record_id, received_datetime, table_name, action, data, source_site_id) VALUES
                    ('join_a', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                        '{"name_ID":"patient","store_ID":"store_a"}', 1),
                    -- Two for store B: only the latest is recreated
                    ('join_b_old', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                        '{"name_ID":"patient","store_ID":"store_b"}', 1),
                    ('join_b', '2025-01-02 00:00:00', 'name_store_join', 'UPSERT',
                        '{"name_ID":"patient","store_ID":"store_b"}', 1),
                    ('join_b', '2025-02-01 00:00:00', 'name_store_join', 'DELETE', 'null', 1),
                    -- A store not on central is skipped
                    ('join_c', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                        '{"name_ID":"patient","store_ID":"store_c"}', 1);
                "#,
            )
            .unwrap();

        migrate(
            &connection,
            Some(V3_04_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        let joins: Vec<(String, bool)> = name_store_join::table
            .order(name_store_join::id)
            .select((name_store_join::id, name_store_join::visible))
            .load(connection.lock().connection())
            .unwrap();
        assert_eq!(
            joins,
            vec![("join_a".to_string(), true), ("join_b".to_string(), false)]
        );

        let logged: Vec<(String, String, Option<i32>)> = changelog::table
            .filter(changelog::table_name.eq_any(["name", "name_store_join"]))
            .order(changelog::table_name)
            .select((
                changelog::table_name,
                changelog::record_id,
                changelog::source_site_id,
            ))
            .load(connection.lock().connection())
            .unwrap();
        assert_eq!(
            logged,
            vec![
                ("name".to_string(), "patient".to_string(), Some(1)),
                ("name_store_join".to_string(), "join_b".to_string(), Some(1)),
            ]
        );
    }
}
