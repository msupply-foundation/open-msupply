use crate::migrations::{
    templates::add_data_from_sync_buffer::{sync_buffer, SyncAction},
    *,
};
use anyhow::Context;
use diesel::prelude::*;
use serde::Deserialize;
use util::sync_serde::empty_str_as_option;
pub(crate) struct Migrate;

// copy of name table behaviour
table! {
    name (id) {
        id -> Text,
        next_of_kin_id -> Nullable<Text>,

    }
}

// Copy of deserialisation behaviour of LegacyNameRow in translations
#[derive(Deserialize)]
pub struct LegacyNameRow {
    #[serde(rename = "NEXT_OF_KIN_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub next_of_kin_id: Option<String>,
}

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_next_of_kin_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // Not adding reference constraint as next of kin name might not be synced with patient
            r#"
                ALTER TABLE name ADD COLUMN next_of_kin_id TEXT;
            "#
        )?;

        let sync_buffer_rows = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("name")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (name_id, data) in sync_buffer_rows {
            let legacy_row = serde_json::from_str::<LegacyNameRow>(&data).with_context(|| {
                format!("Error parsing sync data for name: {} {}", name_id, data)
            })?;
            diesel::update(name::table)
                .filter(name::id.eq(name_id))
                .set(name::next_of_kin_id.eq(legacy_row.next_of_kin_id))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        migrations::{v2_05_00::V2_05_00, v2_06_00::V2_06_00},
        test_db::*,
    };
    use diesel::{sql_query, sql_types::Timestamp, RunQueryDsl};

    fn setup_test_dependencies(connection: &StorageConnection) {
        let run = |sql: &str| {
            sql_query(sql)
                .execute(connection.lock().connection())
                .unwrap()
        };
        // Add some names with all required fields
        run("INSERT INTO name (id, name, code, type, is_customer, is_supplier, is_manufacturer, is_donor, on_hold) VALUES ('name1', 'Name 1', 'N1', 'FACILITY', false, false, false, false, false) ON CONFLICT (id) DO NOTHING;");
        run("INSERT INTO name (id, name, code, type, is_customer, is_supplier, is_manufacturer, is_donor, on_hold) VALUES ('name2', 'Name 2', 'N2', 'FACILITY', false, false, false, false, false) ON CONFLICT (id) DO NOTHING;");
        run("INSERT INTO name (id, name, code, type, is_customer, is_supplier, is_manufacturer, is_donor, on_hold) VALUES ('name3', 'Name 3', 'N3', 'FACILITY', false, false, false, false, false) ON CONFLICT (id) DO NOTHING;");
        run("INSERT INTO name (id, name, code, type, is_customer, is_supplier, is_manufacturer, is_donor, on_hold) VALUES ('name4', 'Name 4', 'N4', 'FACILITY', false, false, false, false, false) ON CONFLICT (id) DO NOTHING;");
    }

    fn add_name_sync_buffer_entry(
        connection: &StorageConnection,
        name_id: &str,
        next_of_kin_id: &str,
    ) {
        let sync_data = serde_json::json!({ "NEXT_OF_KIN_ID": next_of_kin_id }).to_string();
        execute_sql_with_error(
            connection,
            sql_query(format!(
                r#"
                    INSERT INTO sync_buffer (record_id, received_datetime, table_name, action, data)
                    VALUES ('{}', $1, 'name', 'UPSERT', '{}');
                "#,
                name_id, sync_data
            ))
            .bind::<Timestamp, _>(chrono::Utc::now().naive_utc()),
        )
        .unwrap();
    }

    #[actix_rt::test]
    async fn test_add_name_next_of_kin_id_migration() {
        let previous_version = V2_05_00.version();
        let version = V2_06_00.version();
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_name_next_of_kin_{}", version),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;
        setup_test_dependencies(&connection);
        // Add sync buffer entries
        add_name_sync_buffer_entry(&connection, "name1", "kin1");
        add_name_sync_buffer_entry(&connection, "name2", "kin2");
        // name3 has no sync data
        // name4 has sync data but empty next_of_kin_id
        add_name_sync_buffer_entry(&connection, "name4", "");
        // Run migration
        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);
        // Assert: Names updated as expected
        let name_rows = name::table
            .select((name::id, name::next_of_kin_id))
            .order_by(name::id.asc())
            .load::<(String, Option<String>)>(connection.lock().connection())
            .unwrap();
        let expected = vec![
            ("name1".to_string(), Some("kin1".to_string())),
            ("name2".to_string(), Some("kin2".to_string())),
            ("name3".to_string(), None),
            ("name4".to_string(), None),
        ];
        assert_eq!(name_rows, expected);
    }
}
