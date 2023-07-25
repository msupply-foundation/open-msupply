use super::{sensor_row::sensor::dsl as sensor_dsl, store_row::store, location_row::location, StorageConnection};

use crate::{repository_error::RepositoryError};

use diesel::prelude::*;
use chrono::NaiveDateTime;

table! {
    sensor (id) {
        id -> Text,
        name -> Text,
        serial -> Text,
        location_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        battery_level -> Nullable<Integer>,
        log_interval -> Nullable<Integer>,
        is_active -> Bool,
        last_connection_timestamp -> Nullable<Timestamp>,
    }
}

table! {
    #[sql_name = "sensor"]
    sensor_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

joinable!(sensor -> store (store_id));
joinable!(sensor -> location (location_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "sensor"]
pub struct SensorRow {
    pub id: String,
    pub name: String,
    pub serial: String,
    pub location_id: Option<String>,
    pub store_id: Option<String>,
    pub battery_level: Option<i32>,
    pub log_interval: Option<i32>,
    pub is_active: bool,
    pub last_connection_timestamp: Option<NaiveDateTime>,
}

impl Default for SensorRow {
    fn default() -> Self {
        SensorRow {
            id: Default::default(),
            name: Default::default(),
            serial: Default::default(),
            location_id: None,
            store_id: None,
            battery_level: None,
            log_interval: None,
            is_active: false,
            last_connection_timestamp: None,
        }
    }
}
pub struct SensorRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SensorRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SensorRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(sensor_dsl::sensor)
            .values(row)
            .on_conflict(sensor_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        diesel::replace_into(sensor_dsl::sensor)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    fn toggle_is_sync_update(&self, id: &str, is_sync_update: bool) -> Result<(), RepositoryError> {
        diesel::update(sensor_is_sync_update::table.find(id))
            .set(sensor_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, false)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<SensorRow>, RepositoryError> {
        let result = sensor_dsl::sensor
            .filter(sensor_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    //pub fn find_many_by_item_id(&self, item_id: &str) -> Result<Vec<BarcodeRow>, RepositoryError> {
    //    let result = barcode_dsl::barcode
    //        .filter(barcode_dsl::item_id.eq(item_id))
    //        .get_results(&self.connection.connection)?;
    //    Ok(result)
    //}

    pub fn sync_upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = sensor_is_sync_update::table
            .find(id)
            .select(sensor_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

#[cfg(test)]
mod test {
    use util::{inline_init, uuid::uuid};

    use crate::{mock::MockDataInserts, test_db::setup_all, SensorRow, SensorRowRepository};

    fn mock_sensor_row_1() -> SensorRow {
        inline_init(|r: &mut SensorRow| {
            r.id = uuid();
            r.serial = "12345678901234".to_string();
            r.name = "Sensor 1".to_string();
            //r.last_connection_timestamp = Some(NaiveDateTime::from_str());
            r.log_interval = Some(1);
        })
    }

    fn mock_sensor_row_2() -> SensorRow {
        inline_init(|r: &mut SensorRow| {
            r.id = uuid();
            r.serial = "4756798811".to_string();
            r.name = "Sensor 2".to_string();
            //r.last_connection_timestamp = Some(NaiveDateTime::from_str());
            r.battery_level = Some(100);
            r.is_active = true;
        })
    }

    #[actix_rt::test]
    async fn sensor_is_sync_update() {
        let (_, connection, _, _) = setup_all(
            "Sensor_is_sync_update",
            MockDataInserts::none().stores().locations(),
        )
        .await;

        let repo = SensorRowRepository::new(&connection);

        // Two rows, to make sure is_sync_update update only affects one row
        let row = mock_sensor_row_1();
        let row2 = mock_sensor_row_2();

        // First insert
        repo.upsert_one(&row).unwrap();
        repo.upsert_one(&row2).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Synchronisation upsert
        repo.sync_upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(true)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Normal upsert
        repo.upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));
    }
}
