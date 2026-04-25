use super::StorageConnection;
use crate::{Delete, Upsert};

use crate::repository_error::RepositoryError;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use chrono::NaiveDate;
use diesel::prelude::*;

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

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
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

impl CurrencyRow {
    pub fn table_name() -> ChangelogTableName {
        ChangelogTableName::Currency
    }
    pub fn record_id(&self) -> String {
        self.id.clone()
    }
}

pub struct CurrencyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CurrencyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CurrencyRowRepository { connection }
    }

    fn _upsert_one(&self, row: &CurrencyRow) -> Result<(), RepositoryError> {
        diesel::insert_into(currency::table)
            .values(row)
            .on_conflict(currency::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &CurrencyRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        self.insert_changelog(&row.id, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        record_id: &str,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let changelog = ChangeLogInsertRow {
            table_name: CurrencyRow::table_name(),
            record_id: record_id.to_string(),
            row_action: action,
            ..Default::default()
        };

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

    fn _delete(&self, currency_id: &str) -> Result<(), RepositoryError> {
        diesel::update(currency::table.filter(currency::id.eq(currency_id)))
            .set(currency::is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, currency_id: &str) -> Result<i64, RepositoryError> {
        self._delete(currency_id)?;
        self.insert_changelog(currency_id, RowActionType::Delete)
    }
}

#[derive(Debug, Clone)]
pub struct CurrencyRowDelete(pub String);
impl Delete for CurrencyRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = CurrencyRowRepository::new(con).delete(&self.0)?;
        Ok(Some(change_log_id))
    }
    fn delete_v7(
        &self,
        con: &StorageConnection,
        changelog: ChangeLogInsertRow,
    ) -> Result<(), RepositoryError> {
        CurrencyRowRepository::new(con)._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
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

impl Upsert for CurrencyRow {
    fn upsert(
        &self,
        con: &StorageConnection,
        changelog: Option<ChangeLogInsertRow>,
    ) -> Result<Option<i64>, RepositoryError> {
        let repo = CurrencyRowRepository::new(con);
        repo._upsert_one(self)?;

        let changelog = changelog.unwrap_or_else(|| ChangeLogInsertRow {
            table_name: CurrencyRow::table_name(),
            record_id: self.record_id(),
            row_action: RowActionType::Upsert,
            ..Default::default()
        });

        let cursor_id = ChangelogRepository::new(con).insert(&changelog)?;
        Ok(Some(cursor_id))
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            CurrencyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
