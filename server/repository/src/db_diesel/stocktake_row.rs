use super::{
    stocktake_row::stocktake::dsl as stocktake_dsl, user_row::user_account, StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete};

use crate::Upsert;
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
    connection: &'a mut StorageConnection,
}

impl<'a> StocktakeRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        StocktakeRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&mut self, row: &StocktakeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stocktake_dsl::stocktake)
            .values(row)
            .on_conflict(stocktake_dsl::id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&mut self, row: &StocktakeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(stocktake_dsl::stocktake)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&mut self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stocktake_dsl::stocktake.filter(stocktake_dsl::id.eq(id)))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&mut self, id: &str) -> Result<Option<StocktakeRow>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::id.eq(id))
            .first(&mut self.connection.connection)
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(
        &mut self,
        ids: &[String],
    ) -> Result<Vec<StocktakeRow>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::id.eq_any(ids))
            .load(&mut self.connection.connection)?;
        Ok(result)
    }

    pub fn find_max_stocktake_number(
        &mut self,
        store_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::store_id.eq(store_id))
            .select(max(stocktake_dsl::stocktake_number))
            .first(&mut self.connection.connection)?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct StocktakeRowDelete(pub String);
// For tests only
impl Delete for StocktakeRowDelete {
    fn delete(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        StocktakeRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &mut StorageConnection) {
        assert_eq!(
            StocktakeRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StocktakeRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        StocktakeRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            StocktakeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
