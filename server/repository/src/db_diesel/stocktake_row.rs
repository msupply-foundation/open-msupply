use super::{user_row::user_account, StorageConnection};

use crate::db_diesel::changelog::changelog::RowOrId;
use crate::repository_error::RepositoryError;
use crate::{ChangelogRepository, RowActionType};
use crate::SourceSiteId;
use crate::diesel_macros::define_batch_table;

use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

define_batch_table! {
    struct: StocktakeRow,
    repo: StocktakeRowRepository,
    table: stocktake (id) {
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
        program_id -> Nullable<Text>,
        counted_by -> Nullable<Text>,
        verified_by -> Nullable<Text>,
        is_initial_stocktake -> Bool,
    }
}

joinable!(stocktake -> user_account (user_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StocktakeStatus {
    #[default]
    New,
    Finalised,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
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
    pub program_id: Option<String>,
    pub counted_by: Option<String>,
    pub verified_by: Option<String>,
    pub is_initial_stocktake: bool,
}
pub struct StocktakeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StocktakeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StocktakeRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &StocktakeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stocktake::table)
            .values(row)
            .on_conflict(stocktake::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &StocktakeRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = StocktakeRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = StocktakeRow::generate_changelog(
            RowOrId::Id(id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        diesel::delete(stocktake::table.filter(stocktake::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StocktakeRow>, RepositoryError> {
        let result = stocktake::table
            .filter(stocktake::id.eq(id))
            .first(self.connection.lock().connection())
            .optional();
        result.map_err(RepositoryError::from)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StocktakeRow>, RepositoryError> {
        let result = stocktake::table
            .filter(stocktake::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn check_exists_by_id(&self, id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            stocktake::table.filter(stocktake::id.eq(id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    pub fn find_max_stocktake_number(
        &self,
        store_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = stocktake::table
            .filter(stocktake::store_id.eq(store_id))
            .select(diesel::dsl::max(stocktake::stocktake_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }

    pub(crate) fn delete_no_changelog(&self, record_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stocktake::table.filter(stocktake::id.eq(record_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
