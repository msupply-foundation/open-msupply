use super::{currency_row::currency::dsl as currency_dsl, StorageConnection};

use crate::repository_error::RepositoryError;

use chrono::NaiveDate;
use diesel::prelude::*;

table! {
    currency (id) {
        id -> Text,
        rate -> Double,
        code -> Text,
        is_home_currency -> Bool,
        date_updated -> Nullable<Date>,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "currency"]
pub struct CurrencyRow {
    pub id: String,
    pub rate: f64,
    pub code: String,
    pub is_home_currency: bool,
    pub date_updated: Option<NaiveDate>,
}

pub struct CurrencyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CurrencyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CurrencyRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &CurrencyRow) -> Result<(), RepositoryError> {
        diesel::insert_into(currency_dsl::currency)
            .values(row)
            .on_conflict(currency_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &CurrencyRow) -> Result<(), RepositoryError> {
        diesel::replace_into(currency_dsl::currency)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        currency_id: &str,
    ) -> Result<Option<CurrencyRow>, RepositoryError> {
        let result = currency_dsl::currency
            .filter(currency_dsl::id.eq(currency_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, currency_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(currency_dsl::currency.filter(currency_dsl::id.eq(currency_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
