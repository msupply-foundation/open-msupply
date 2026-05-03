use super::StorageConnection;
use crate::{ChangelogSyncType, Delete, Upsert};

use crate::repository_error::RepositoryError;
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, KeyValueStoreRepository,
    RowActionType,
};

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
    pub fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Currency,
            record_id: self.id.clone(),
            row_action: action,
            source_site_id: KeyValueStoreRepository::new(con).get_source_site_id(source_site_id)?,
            ..Default::default()
        })
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
        let changelog = row.changelog(self.connection, RowActionType::Upsert, None)?;
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

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<CurrencyRow>, RepositoryError> {
        let result = currency::table
            .filter(currency::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    /// Batch upsert. Does not write changelog rows.
    /// Single batched statement on Postgres; per-row loop on SQLite.
    pub fn _upsert_many(&self, rows: &[CurrencyRow]) -> Result<(), RepositoryError> {
        if rows.is_empty() {
            return Ok(());
        }
        #[cfg(feature = "postgres")]
        {
            use diesel::upsert::excluded;
            diesel::insert_into(currency::table)
                .values(rows)
                .on_conflict(currency::id)
                .do_update()
                .set((
                    currency::rate.eq(excluded(currency::rate)),
                    currency::code.eq(excluded(currency::code)),
                    currency::is_home_currency.eq(excluded(currency::is_home_currency)),
                    currency::date_updated.eq(excluded(currency::date_updated)),
                    currency::is_active.eq(excluded(currency::is_active)),
                ))
                .execute(self.connection.lock().connection())?;
        }
        #[cfg(not(feature = "postgres"))]
        {
            for row in rows {
                self._upsert_one(row)?;
            }
        }
        Ok(())
    }

    /// Batch soft-delete (sets is_active=false). Does not write changelog rows.
    pub fn delete_many(&self, ids: &[String]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::update(currency::table.filter(currency::id.eq_any(ids)))
            .set(currency::is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    fn _delete(&self, currency_id: &str) -> Result<(), RepositoryError> {
        diesel::update(currency::table.filter(currency::id.eq(currency_id)))
            .set(currency::is_active.eq(false))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, currency_id: &str) -> Result<i64, RepositoryError> {
        self._delete(currency_id)?;
        let row = CurrencyRow {
            id: currency_id.to_string(),
            ..Default::default()
        };
        let changelog = row.changelog(self.connection, RowActionType::Delete, None)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        CurrencyRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                self.changelog(con, RowActionType::Upsert, source_site_id)?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            CurrencyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
