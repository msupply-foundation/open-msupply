use super::{currency_row::currency::dsl as currency_dsl, StorageConnection};
use crate::Upsert;

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
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = currency)]
pub struct CurrencyRow {
    pub id: String,
    pub rate: f64,
    pub code: String,
    pub is_home_currency: bool,
    pub date_updated: Option<NaiveDate>,
}

pub struct CurrencyRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> CurrencyRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        CurrencyRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&mut self, row: &CurrencyRow) -> Result<(), RepositoryError> {
        diesel::insert_into(currency_dsl::currency)
            .values(row)
            .on_conflict(currency_dsl::id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&mut self, row: &CurrencyRow) -> Result<(), RepositoryError> {
        diesel::replace_into(currency_dsl::currency)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &mut self,
        currency_id: &str,
    ) -> Result<Option<CurrencyRow>, RepositoryError> {
        let result = currency_dsl::currency
            .filter(currency_dsl::id.eq(currency_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&mut self, currency_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(currency_dsl::currency.filter(currency_dsl::id.eq(currency_id)))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for CurrencyRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        CurrencyRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            CurrencyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
