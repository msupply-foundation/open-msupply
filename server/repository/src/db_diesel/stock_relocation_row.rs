use super::StorageConnection;

use crate::Upsert;
use crate::{repository_error::RepositoryError, Delete};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    stock_relocation (id) {
        id -> Text,
        store_id -> Text,
        stock_movement_number -> BigInt,
        status -> crate::db_diesel::stock_relocation_row::StockRelocationStatusMapping,
        created_datetime -> Timestamp,
        created_by -> Text,
        confirmed_datetime -> Nullable<Timestamp>,
        finalised_datetime -> Nullable<Timestamp>,
        comment -> Nullable<Text>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StockRelocationStatus {
    #[default]
    New,
    Confirmed,
    Finalised,
}

impl StockRelocationStatus {
    pub fn index(&self) -> u8 {
        match self {
            StockRelocationStatus::New => 1,
            StockRelocationStatus::Confirmed => 2,
            StockRelocationStatus::Finalised => 3,
        }
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = stock_relocation)]
pub struct StockRelocationRow {
    pub id: String,
    pub store_id: String,
    pub stock_movement_number: i64,
    pub status: StockRelocationStatus,
    pub created_datetime: NaiveDateTime,
    pub created_by: String,
    pub confirmed_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub comment: Option<String>,
}

pub struct StockRelocationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockRelocationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockRelocationRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &StockRelocationRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(stock_relocation::table)
            .values(row)
            .on_conflict(stock_relocation::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &StockRelocationRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::StockRelocation,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(&old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };
        diesel::delete(stock_relocation::table.filter(stock_relocation::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StockRelocationRow>, RepositoryError> {
        let result = stock_relocation::table
            .filter(stock_relocation::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct StockRelocationRowDelete(pub String);
// For tests only
impl Delete for StockRelocationRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        StockRelocationRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StockRelocationRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StockRelocationRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = StockRelocationRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StockRelocationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
