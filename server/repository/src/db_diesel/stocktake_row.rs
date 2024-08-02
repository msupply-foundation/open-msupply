use super::{
    stocktake_row::stocktake::dsl as stocktake_dsl, user_row::user_account, StorageConnection,
};

use crate::Upsert;
use crate::{repository_error::RepositoryError, Delete};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use chrono::{NaiveDate, NaiveDateTime};
use diesel::{dsl::max, prelude::*};
use diesel_derive_enum::DbEnum;
use util::Defaults;

table! {
    stocktake (id) {
        id -> Text,
        store_id -> Text,
        user_id -> Text,
        stocktake_number -> BigInt,
        comment	-> Nullable<Text>,
        description -> Nullable<Text>,
        status -> crate::db_diesel::stocktake_row::StocktakeStatusMapping,
        created_datetime -> Timestamp,
        stocktake_date -> Nullable<Date>,
        finalised_datetime -> Nullable<Timestamp>,
        inventory_addition_id -> Nullable<Text>,
        inventory_reduction_id -> Nullable<Text>,
        is_locked -> Bool,
    }
}

joinable!(stocktake -> user_account (user_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StocktakeStatus {
    New,
    Finalised,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[diesel(table_name = stocktake)]
pub struct StocktakeRow {
    pub id: String,
    pub store_id: String,
    pub user_id: String,
    pub stocktake_number: i64,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: StocktakeStatus,
    pub created_datetime: NaiveDateTime,
    pub stocktake_date: Option<NaiveDate>,
    pub finalised_datetime: Option<NaiveDateTime>,
    /// reference to the inventory adjustment shipment
    pub inventory_addition_id: Option<String>,
    pub inventory_reduction_id: Option<String>,
    pub is_locked: bool,
}

impl Default for StocktakeStatus {
    fn default() -> Self {
        Self::New
    }
}

impl Default for StocktakeRow {
    fn default() -> Self {
        Self {
            created_datetime: Defaults::naive_date_time(),
            status: Default::default(),
            // Defaults
            id: Default::default(),
            store_id: Default::default(),
            user_id: Default::default(),
            stocktake_number: Default::default(),
            stocktake_date: Default::default(),
            comment: Default::default(),
            description: Default::default(),
            finalised_datetime: Default::default(),
            inventory_addition_id: Default::default(),
            inventory_reduction_id: Default::default(),
            is_locked: Default::default(),
        }
    }
}

pub struct StocktakeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StocktakeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StocktakeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &StocktakeRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(stocktake_dsl::stocktake)
            .values(row)
            .on_conflict(stocktake_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &StocktakeRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Stocktake,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: None,
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
        diesel::delete(stocktake_dsl::stocktake.filter(stocktake_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StocktakeRow>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StocktakeRow>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_max_stocktake_number(
        &self,
        store_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::store_id.eq(store_id))
            .select(max(stocktake_dsl::stocktake_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct StocktakeRowDelete(pub String);
// For tests only
impl Delete for StocktakeRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        StocktakeRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StocktakeRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StocktakeRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = StocktakeRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StocktakeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
