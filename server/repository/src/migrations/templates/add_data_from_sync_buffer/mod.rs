use crate::migrations::*;

use anyhow::Context;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::Deserialize;

// This is a more complex example of schema migration with addition of a new field to central
// data type, which would require populating the new field from sync buffer, ideally we would use logic in sync translation for this
// but that layer is not accessible in repository due to circular dependency constraints

// Minimal diesel definitions needed to query sync_buffer and update store
table! {
    sync_buffer (record_id) {
        record_id -> Text,
        table_name -> Text,
        action -> crate::migrations::templates::add_data_from_sync_buffer::SyncBufferActionMapping,
        data -> Text,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncBufferAction {
    Upsert,
}

table! {
    store (id) {
        id -> Text,
        disabled -> Bool,
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyStoreRow {
    disabled: bool,
}

pub(crate) struct V1_00_08;

impl Migration for V1_00_08 {
    fn version(&self) -> Version {
        Version::from_str("1.0.8")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use self::store::dsl as store_dsl;
        use self::sync_buffer::dsl as sync_buffer_dsl;

        sql!(
            &mut connection,
            r#"
            ALTER TABLE store ADD disabled BOOLEAN NOT NULL DEFAULT false
        "#
        )?;

        // Find all store upsert sync buffer rows
        let sync_buffer_rows = sync_buffer_dsl::sync_buffer
            .select((sync_buffer_dsl::record_id, sync_buffer_dsl::data))
            .filter(
                sync_buffer_dsl::action
                    .eq(SyncBufferAction::Upsert)
                    .and(sync_buffer_dsl::table_name.eq("store")),
            )
            .load::<(String, String)>(&mut connection.connection)?;

        for (id, data) in sync_buffer_rows {
            let legacy_row = serde_json::from_str::<LegacyStoreRow>(&data)
                .with_context(|| format!("Cannot parse sync buffer row data: {}", data))?;

            diesel::update(store_dsl::store)
                .filter(store_dsl::id.eq(id))
                .set(store_dsl::disabled.eq(legacy_row.disabled))
                .execute(&mut connection.connection)?;
        }

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_00_08() {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::{sql_query, sql_types::Timestamp, RunQueryDsl};
    use util::*;

    // For data migrations we want to insert data then do the migration, thus setup with version - 1
    // Then insert data and upgrade to this version

    let previous_version = templates::data_migration::V1_00_06.version();
    let version = V1_00_08.version();

    // Migrate to version - 1
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    sql!(
        &connection,
        r#"
        INSERT INTO name 
        (id, type, is_customer, is_supplier, code, name)
        VALUES 
        ('name_id', 'STORE', false, false, '', '');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO store 
        (id, name_id, site_id, code)
        VALUES 
        ('store1_id', 'name_id', 1, '');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO store 
        (id, name_id, site_id, code)
        VALUES 
        ('store2_id', 'name_id', 1, '');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO store 
        (id, name_id, site_id, code) 
        VALUES 
        ('store3_id', 'name_id', 1, '');
    "#
    )
    .unwrap();

    // Full sync_buffer.data
    let sync_buffer_data = r#"{
        "ID": "store2_id",
        "name": "General",
        "code": "GEN",
        "name_ID": "name_id",
        "mwks_export_mode": "",
        "IS_HIS": false,
        "sort_issues_by_status_spare": false,
        "disabled": true,
        "responsible_user_ID": "",
        "organisation_name": "",
        "address_1": "",
        "address_2": "",
        "logo": "[object Picture]",
        "sync_id_remote_site": 1,
        "address_3": "",
        "address_4": "",
        "address_5": "",
        "postal_zip_code": "",
        "store_mode": "store",
        "phone": "",
        "tags": "",
        "spare_user_1": "",
        "spare_user_2": "",
        "spare_user_3": "",
        "spare_user_4": "",
        "spare_user_5": "",
        "spare_user_6": "",
        "spare_user_8": "",
        "spare_user_8": "",
        "spare_user_9": "",
        "spare_user_10": "",
        "spare_user_11": "",
        "spare_user_12": "",
        "spare_user_13": "",
        "spare_user_14": "",
        "spare_user_15": "",
        "spare_user_16": "",
        "custom_data": null,
        "created_date": "2021-09-03"
    }"#;

    execute_sql_with_error(
        &connection,
        sql_query(format!(
            r#"
            INSERT INTO sync_buffer 
            (record_id, received_datetime, table_name, action, data) 
            VALUES 
            ('store2_id', $1, 'store', 'UPSERT', '{sync_buffer_data}');
        "#
        ))
        .bind::<Timestamp, _>(Defaults::naive_date_time()),
    )
    .unwrap();

    // Simplified sync_buffer.data
    execute_sql_with_error(
        &connection,
        sql_query(
            r#"
            INSERT INTO sync_buffer 
            (record_id, received_datetime, table_name, action, data) 
            VALUES 
            ('store3_id', $1, 'store', 'UPSERT', '{"disabled": true}');
        "#
            .to_string(),
        )
        .bind::<Timestamp, _>(Defaults::naive_date_time()),
    )
    .unwrap();

    // Migrate to this version
    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);

    use self::store::dsl as store_dsl;

    // Check data
    let stores = store_dsl::store
        .select((store_dsl::id, store_dsl::disabled))
        .order_by(store_dsl::id.asc())
        .load::<(String, bool)>(&mut connection.connection)
        .unwrap();

    assert_eq!(
        stores,
        vec![
            ("store1_id".to_string(), false),
            ("store2_id".to_string(), true),
            ("store3_id".to_string(), true),
        ]
    )
}
