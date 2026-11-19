use super::StorageConnection;
use crate::{ChangelogSyncType, Delete, SourceSiteId, Upsert, trim, trim_spaces};

use crate::repository_error::RepositoryError;
use crate::{ChangelogRepository, RowActionType};

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

/// A kind of record valued in a currency.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CurrencyUser {
    Invoice,
    PurchaseOrder,
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

    /// Letter case counts; spaces around either code don't.
    pub fn find_by_trimmed_code(&self, code: &str) -> Result<Vec<CurrencyRow>, RepositoryError> {
        let result = currency::table
            .filter(trim(currency::code).eq(trim_spaces(code)))
            .order(currency::id.asc())
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_all(&self) -> Result<Vec<CurrencyRow>, RepositoryError> {
        let result = currency::table
            .order((currency::code.asc(), currency::id.asc()))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    /// The first kind of record valued in the currency, if any.
    pub fn used_by(&self, currency_id: &str) -> Result<Option<CurrencyUser>, RepositoryError> {
        use super::{
            invoice_row::invoice_with_links, purchase_order_row::purchase_order_with_links,
        };
        use diesel::dsl::exists;
        let mut guard = self.connection.lock();
        let connection = guard.connection();
        if diesel::select(exists(
            invoice_with_links::table.filter(invoice_with_links::currency_id.eq(currency_id)),
        ))
        .get_result(connection)?
        {
            return Ok(Some(CurrencyUser::Invoice));
        }
        if diesel::select(exists(
            purchase_order_with_links::table
                .filter(purchase_order_with_links::currency_id.eq(currency_id)),
        ))
        .get_result(connection)?
        {
            return Ok(Some(CurrencyUser::PurchaseOrder));
        }
        Ok(None)
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

#[derive(Debug, Clone)]
pub struct CurrencyRowDelete(pub String);
impl Delete for CurrencyRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = CurrencyRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => CurrencyRow::generate_changelog(
                self.0.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._mark_deleted(&self.0)?;
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
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
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
