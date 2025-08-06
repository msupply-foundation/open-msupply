use crate::migrations::*;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::Deserialize;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncAction {
    Upsert,
}

table! {
    sync_buffer (record_id) {
        record_id -> Text,
        data -> Text,
        action -> crate::migrations::v2_10_00::reintegrate_location_volume::SyncActionMapping,
        table_name -> Text,
        integration_error -> Nullable<Text>,
    }
}
table! {
    location (id) {
        id -> Text,
        volume -> Double,
        name -> Text,
    }
}

#[derive(Deserialize)]
pub struct LegacyLocationRow {
    #[serde(rename = "Volume")]
    pub volume: f64,
}

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate_location_volume"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let location_sync_buffer = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("Location")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in location_sync_buffer {
            let legacy_location_volume = match serde_json::from_str::<LegacyLocationRow>(&data) {
                Ok(row) => {
                    if row.volume == 0.0 {
                        continue; // Skip rows without a volume set
                    }
                    row.volume
                }
                Err(e) => {
                    diesel::update(sync_buffer::table)
                        .filter(sync_buffer::record_id.eq(&id))
                        .set(sync_buffer::integration_error.eq(e.to_string()))
                        .execute(connection.lock().connection())?;

                    println!("Error parsing legacy location data for ID {}: {}", id, e);
                    continue; // Skip rows with parsing errors
                }
            };

            diesel::update(location::table)
                .filter(location::id.eq(id))
                .set((location::volume.eq(legacy_location_volume),))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_location_volume() {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::{sql_query, sql_types::Timestamp, RunQueryDsl};
    use util::*;

    let previous_version = v2_09_01::V2_09_01.version();
    let version = v2_10_00::V2_10_00.version();
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}_location_volume"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    sql!(
        &connection,
        r#"
        INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('name_id', 'STORE', false, false, '', '');
        INSERT INTO name_link (id, name_id) VALUES ('name_link_id', 'name_id');
        INSERT INTO store (id, name_link_id, site_id, code) VALUES
        ('store_id', 'name_link_id', 1, '');

        INSERT INTO location (id, name, code, on_hold, store_id) VALUES
        ('location_id', 'test location', 'TL', false, 'store_id');
    "#
    )
    .unwrap();

    let location_sync_buffer_data = r#"{
        "ID": "location_id",
        "code": "TL",
        "Description": "test location legacy name",
        "store_ID": "store_id",
        "hold": false,
        "type_ID": "",
        "Volume": 10.0
    }"#;

    execute_sql_with_error(
        &connection,
        sql_query(format!(
            r#"
            INSERT INTO sync_buffer
            (record_id, received_datetime, table_name, action, data)
            VALUES
            ('location_id', $1, 'Location', 'UPSERT', '{location_sync_buffer_data}');
        "#
        ))
        .bind::<Timestamp, _>(Defaults::naive_date_time()),
    )
    .unwrap();

    migrate(&connection, Some(version.clone())).unwrap();

    let locations = location::table
        .select((location::id, location::volume, location::name))
        .load::<(String, f64, String)>(connection.lock().connection())
        .unwrap();
    // confirm that only the volume is updated - other fields like name should be owned
    // the oms site now
    assert_eq!(
        locations,
        vec![("location_id".to_string(), 10.0, "test location".to_string())]
    );
}
