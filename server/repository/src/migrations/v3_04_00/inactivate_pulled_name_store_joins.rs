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

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "inactivate_pulled_name_store_joins"
    }

    /// Patient joins whose latest pulled sync_buffer row says they aren't visible are set
    /// not visible, or recreated not visible if missing.
    ///
    /// No changelog rows: central already has these joins not visible.
    ///
    /// Remotes only: sites that started below 2.0 (central needs 2.0) or have pushed
    /// over v6/v7.
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        let started_before_v6 = config
            .starting_database_version
            .as_ref()
            .is_some_and(|version| *version < Version::from_str("2.0.0"));
        if !started_before_v6 && !has_pushed_over_v6_or_v7(connection)? {
            return Ok(());
        }

        sql!(
            connection,
            r#"
            {pulled}
            UPDATE name_store_join SET visible = FALSE
            WHERE visible = TRUE
              AND id IN (SELECT id FROM pulled)
              AND name_link_id IN (
                SELECT nl.id FROM name_link nl
                JOIN name n ON n.id = nl.name_id
                WHERE n.type = 'PATIENT'
              );
            "#,
            pulled = not_visible_rows_cte()
        )?;

        let missing_joins: Vec<MissingJoin> =
            diesel::sql_query(missing_joins_query()).load(connection.lock().connection())?;

        // One join per patient and store, the latest pulled
        let mut seen = BTreeSet::new();
        let missing_joins: Vec<MissingJoin> = missing_joins
            .into_iter()
            .filter(|join| seen.insert((join.name_id.clone(), join.store_id.clone())))
            .collect();

        // Chunked to stay under SQLite's bind parameter limit
        for chunk in missing_joins.chunks(500) {
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
        }

        Ok(())
    }
}

#[derive(QueryableByName)]
struct MissingJoin {
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

/// Joins whose latest sync_buffer row is an upsert that isn't visible. Rows from central
/// are OMS rows (`name_id`, `store_id`, `visible`), rows from OG are legacy rows
/// (`name_ID`, `store_ID`, `inactive`)
fn not_visible_rows_cte() -> String {
    let (is_not_visible, name_id, store_id) = if cfg!(feature = "postgres") {
        (
            "((sb.data::jsonb ->> 'visible') = 'false' OR (sb.data::jsonb ->> 'inactive') = 'true')",
            "COALESCE(sb.data::jsonb ->> 'name_id', sb.data::jsonb ->> 'name_ID')",
            "COALESCE(sb.data::jsonb ->> 'store_id', sb.data::jsonb ->> 'store_ID')",
        )
    } else {
        (
            "(json_extract(sb.data, '$.visible') = 0 OR json_extract(sb.data, '$.inactive') = 1)",
            "COALESCE(json_extract(sb.data, '$.name_id'), json_extract(sb.data, '$.name_ID'))",
            "COALESCE(json_extract(sb.data, '$.store_id'), json_extract(sb.data, '$.store_ID'))",
        )
    };

    format!(
        r#"
        WITH latest AS (
            SELECT record_id, MAX(cursor) AS cursor
            FROM sync_buffer
            WHERE table_name = 'name_store_join' AND is_integrated = TRUE
            GROUP BY record_id
        ),
        pulled AS (
            SELECT sb.record_id AS id, {name_id} AS name_link_id, {store_id} AS store_id,
                sb.cursor
            FROM latest
            JOIN sync_buffer sb ON sb.cursor = latest.cursor
            WHERE sb.action = 'UPSERT' AND {is_not_visible}
        )
        "#
    )
}

/// Patient joins pulled as not visible that no longer exist, where the patient has no join
/// for that store. Latest first.
fn missing_joins_query() -> String {
    format!(
        r#"
        {}
        SELECT pulled.id, pulled.name_link_id, pulled.store_id, n.id AS name_id,
            n.is_customer, n.is_supplier
        FROM pulled
        JOIN name_link nl ON nl.id = pulled.name_link_id
        JOIN name n ON n.id = nl.name_id
        JOIN store ON store.id = pulled.store_id
        WHERE n.type = 'PATIENT'
          AND NOT EXISTS (SELECT 1 FROM name_store_join nsj WHERE nsj.id = pulled.id)
          AND NOT EXISTS (
            SELECT 1 FROM name_store_join nsj
            JOIN name_link l ON l.id = nsj.name_link_id
            WHERE l.name_id = n.id AND nsj.store_id = pulled.store_id
          )
        ORDER BY pulled.cursor DESC
        "#,
        not_visible_rows_cte()
    )
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
    use diesel::{connection::SimpleConnection, dsl::sql, prelude::*, sql_types::BigInt};

    use super::name_store_join;

    #[actix_rt::test]
    async fn migration_inactivate_pulled_name_store_joins() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_inactivate_pulled_name_store_joins",
            version: Some(V3_03_01.version()),
            ..Default::default()
        })
        .await;

        connection
            .lock()
            .connection()
            .batch_execute(
                r#"
                INSERT INTO key_value_store (id, value_int) VALUES ('SYNC_PUSH_CURSOR_V7', 1);
                INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES
                    ('store_a_name', 'STORE', false, false, 'A', 'Store A'),
                    ('store_b_name', 'STORE', false, false, 'B', 'Store B'),
                    ('patient_a', 'PATIENT', true, false, 'PA', 'Patient A'),
                    ('patient_b', 'PATIENT', true, false, 'PB', 'Patient B'),
                    ('facility', 'FACILITY', true, false, 'F', 'Facility');
                INSERT INTO name_link (id, name_id) VALUES
                    ('store_a_name', 'store_a_name'), ('store_b_name', 'store_b_name'),
                    ('patient_a', 'patient_a'), ('patient_b', 'patient_b'), ('facility', 'facility');
                INSERT INTO store (id, name_link_id, code, site_id) VALUES
                    ('store_a', 'store_a_name', 'A', 3),
                    ('store_b', 'store_b_name', 'B', 3);
                INSERT INTO name_store_join (id, name_link_id, store_id, name_is_customer, name_is_supplier) VALUES
                    ('from_central', 'patient_a', 'store_a', true, false),
                    ('sent_again', 'patient_b', 'store_a', true, false),
                    ('facility', 'facility', 'store_a', true, false);
                INSERT INTO sync_buffer (record_id, received_datetime, table_name, action, data, source_site_id, is_integrated) VALUES
                    ('from_central', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                        '{"id":"from_central","name_id":"patient_a","store_id":"store_a","name_is_customer":true,"name_is_supplier":false,"visible":false}', 1, TRUE),
                    -- Deleted on pull from OG, so recreated
                    ('from_og', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                        '{"ID":"from_og","name_ID":"patient_a","store_ID":"store_b","inactive":true}', 1, TRUE),
                    ('sent_again', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                        '{"ID":"sent_again","name_ID":"patient_b","store_ID":"store_a","inactive":true}', 1, TRUE),
                    ('sent_again', '2025-01-02 00:00:00', 'name_store_join', 'UPSERT',
                        '{"ID":"sent_again","name_ID":"patient_b","store_ID":"store_a","inactive":false}', 1, TRUE),
                    ('facility', '2025-01-01 00:00:00', 'name_store_join', 'UPSERT',
                        '{"ID":"facility","name_ID":"facility","store_ID":"store_a","inactive":true}', 1, TRUE);
                "#,
            )
            .unwrap();

        migrate(
            &connection,
            Some(V3_04_00.version()),
            MigrationConfig::default(),
        )
        .unwrap();

        let joins: Vec<(String, String, bool)> = name_store_join::table
            .order(name_store_join::id)
            .select((
                name_store_join::id,
                name_store_join::store_id,
                name_store_join::visible,
            ))
            .load(connection.lock().connection())
            .unwrap();
        assert_eq!(
            joins,
            vec![
                ("facility".to_string(), "store_a".to_string(), true),
                ("from_central".to_string(), "store_a".to_string(), false),
                ("from_og".to_string(), "store_b".to_string(), false),
                ("sent_again".to_string(), "store_a".to_string(), true),
            ]
        );

        let logged: i64 = diesel::select(sql::<BigInt>(
            "(SELECT COUNT(*) FROM changelog WHERE table_name = 'name_store_join')",
        ))
        .get_result(connection.lock().connection())
        .unwrap();
        assert_eq!(logged, 0);
    }
}
