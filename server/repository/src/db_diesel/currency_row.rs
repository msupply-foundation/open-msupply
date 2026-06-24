use super::StorageConnection;
use crate::SourceSiteId;

use crate::repository_error::RepositoryError;
use crate::{ChangelogRepository, RowActionType};
use crate::diesel_macros::define_batch_table;

use chrono::NaiveDate;
use diesel::prelude::*;

define_batch_table! {
    struct: CurrencyRow,
    repo: CurrencyRowRepository,
    table: currency (id) {
        id -> Text,
        rate -> Double,
        code -> Text,
        is_home_currency -> Bool,
        date_updated -> Nullable<Date>,
        is_active -> Bool,
    }
}

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = currency)]
pub struct CurrencyRow {
    pub id: String,
    pub rate: f64,
    pub code: String,
    pub is_home_currency: bool,
    pub date_updated: Option<NaiveDate>,
    pub is_active: bool,
}
pub struct CurrencyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CurrencyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CurrencyRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &CurrencyRow) -> Result<(), RepositoryError> {
        diesel::insert_into(currency::table)
            .values(row)
            .on_conflict(currency::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &CurrencyRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = CurrencyRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        currency_id: &str,
    ) -> Result<Option<CurrencyRow>, RepositoryError> {
        let result = currency::table
            .filter(currency::id.eq(currency_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn check_exists_by_id(&self, currency_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            currency::table.filter(currency::id.eq(currency_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<CurrencyRow>, RepositoryError> {
        let result = currency::table
            .filter(currency::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    fn _mark_deleted(&self, currency_id: &str) -> Result<(), RepositoryError> {
        diesel::update(currency::table.filter(currency::id.eq(currency_id)))
            .set(currency::is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub(crate) fn _batch_delete(&self, ids: &[&str]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::update(currency::table.filter(currency::id.eq_any(ids)))
            .set(currency::is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn mark_deleted(&self, currency_id: &str) -> Result<(), RepositoryError> {
        self._mark_deleted(currency_id)?;
        let changelog = CurrencyRow::generate_changelog(
            currency_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}
