use super::StorageConnection;
use crate::syncv7::*;
use crate::{impl_record, Delete};

use crate::repository_error::RepositoryError;

use chrono::NaiveDate;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    currency (id) {
        id -> Text,
        rate -> Double,
        code -> Text,
        is_home_currency -> Bool,
        date_updated -> Nullable<Date>,
        is_active -> Bool,
    }
}

#[derive(
    Clone, Queryable, Insertable, Serialize, Deserialize, AsChangeset, Debug, PartialEq, Default,
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

impl_record! {
    struct: CurrencyRow,
    table: currency,
    id_field: id
}

crate::impl_central_sync_record!(CurrencyRow, crate::ChangelogTableName::Currency);

pub(crate) struct Translator;

impl TranslatorTrait for Translator {
    type Item = CurrencyRow;
}

impl Translator {
    // Needs to be added to translators() in ..
    #[deny(dead_code)]
    pub(crate) fn boxed() -> Box<dyn BoxableSyncRecord> {
        Box::new(Self)
    }
}

pub struct CurrencyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CurrencyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CurrencyRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &CurrencyRow) -> Result<(), RepositoryError> {
        row.upsert_internal(&self.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        currency_id: &str,
    ) -> Result<Option<CurrencyRow>, RepositoryError> {
        CurrencyRow::find_by_id(self.connection, currency_id)
    }

    pub fn delete(&self, currency_id: &str) -> Result<(), RepositoryError> {
        diesel::update(currency::table.filter(currency::id.eq(currency_id)))
            .set(currency::is_active.eq(false))
            .execute(self.connection.lock().connection())?;

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct CurrencyRowDelete(pub String);
impl Delete for CurrencyRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        CurrencyRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    fn assert_deleted(&self, con: &StorageConnection) {
        assert!(matches!(
            CurrencyRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(CurrencyRow {
                is_active: false,
                ..
            })) | Ok(None)
        ));
    }
}
