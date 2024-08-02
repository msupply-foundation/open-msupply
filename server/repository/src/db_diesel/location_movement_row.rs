use super::{
    location_movement_row::location_movement::dsl as location_movement_dsl, location_row::location,
    stock_line_row::stock_line, store_row::store, StorageConnection,
};
use crate::{repository_error::RepositoryError, Upsert};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

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

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = location_movement)]
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

    pub fn upsert_one(&self, row: &LocationMovementRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(location_movement_dsl::location_movement)
            .values(row)
            .on_conflict(location_movement_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &LocationMovementRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::LocationMovement,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LocationMovementRow>, RepositoryError> {
        let result = location_movement_dsl::location_movement
            .filter(location_movement_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            location_movement_dsl::location_movement.filter(location_movement_dsl::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for LocationMovementRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = LocationMovementRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            LocationMovementRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
