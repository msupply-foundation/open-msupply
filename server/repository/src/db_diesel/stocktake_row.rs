use super::StorageConnection;

use crate::{repository_error::RepositoryError, stocktake_row::stocktake::dsl as stocktake_dsl};

use diesel::prelude::*;

use chrono::{NaiveDate, NaiveDateTime};
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
        inventory_adjustment_id -> Nullable<Text>,
        is_locked -> Bool,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StocktakeStatus {
    New,
    Finalised,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[table_name = "stocktake"]
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
    pub inventory_adjustment_id: Option<String>,
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
            inventory_adjustment_id: Default::default(),
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

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StocktakeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stocktake_dsl::stocktake)
            .values(row)
            .on_conflict(stocktake_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &StocktakeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(stocktake_dsl::stocktake)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stocktake_dsl::stocktake.filter(stocktake_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StocktakeRow>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StocktakeRow>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
