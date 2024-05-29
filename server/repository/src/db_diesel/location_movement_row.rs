use super::{
    location_movement_row::location_movement::dsl as location_movement_dsl, location_row::location,
    stock_line_row::stock_line, store_row::store, StorageConnection,
};

use crate::{repository_error::RepositoryError, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    location_movement (id) {
        id -> Text,
        store_id -> Text,
        stock_line_id -> Text,
        location_id -> Nullable<Text>,
        enter_datetime -> Nullable<Timestamp>,
        exit_datetime -> Nullable<Timestamp>,
    }
}

joinable!(location_movement -> store (store_id));
joinable!(location_movement -> stock_line (stock_line_id));
joinable!(location_movement -> location (location_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[table_name = "location_movement"]
pub struct LocationMovementRow {
    pub id: String,
    pub store_id: String,
    pub stock_line_id: String,
    pub location_id: Option<String>,
    pub enter_datetime: Option<NaiveDateTime>,
    pub exit_datetime: Option<NaiveDateTime>,
}

pub struct LocationMovementRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationMovementRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationMovementRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &LocationMovementRow) -> Result<(), RepositoryError> {
        diesel::insert_into(location_movement_dsl::location_movement)
            .values(row)
            .on_conflict(location_movement_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &LocationMovementRow) -> Result<(), RepositoryError> {
        diesel::replace_into(location_movement_dsl::location_movement)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LocationMovementRow>, RepositoryError> {
        let result = location_movement_dsl::location_movement
            .filter(location_movement_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            location_movement_dsl::location_movement.filter(location_movement_dsl::id.eq(id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for LocationMovementRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        LocationMovementRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationMovementRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
