use super::StorageConnection;

use crate::db_diesel::changelog::changelog::RowOrId;
use crate::Upsert;
use crate::{repository_error::RepositoryError, Delete};
use crate::{ChangelogRepository, ChangelogSyncType, RowActionType, SourceSiteId};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    stock_relocation (id) {
        id -> Text,
        store_id -> Text,
        stock_movement_number -> BigInt,
        status -> crate::db_diesel::stock_relocation_row::StockRelocationStatusMapping,
        created_datetime -> Timestamp,
        created_by -> Text,
        confirmed_datetime -> Nullable<Timestamp>,
        finalised_datetime -> Nullable<Timestamp>,
        comment -> Nullable<Text>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StockRelocationStatus {
    #[default]
    New,
    Confirmed,
    Finalised,
}

impl StockRelocationStatus {
    pub fn index(&self) -> u8 {
        match self {
            StockRelocationStatus::New => 1,
            StockRelocationStatus::Confirmed => 2,
            StockRelocationStatus::Finalised => 3,
        }
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = stock_relocation)]
pub struct StockRelocationRow {
    pub id: String,
    pub store_id: String,
    pub stock_movement_number: i64,
    pub status: StockRelocationStatus,
    pub created_datetime: NaiveDateTime,
    pub created_by: String,
    pub confirmed_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub comment: Option<String>,
}

pub struct StockRelocationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockRelocationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockRelocationRowRepository { connection }
    }

    fn _upsert(&self, row: &StockRelocationRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stock_relocation::table)
            .values(row)
            .on_conflict(stock_relocation::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &StockRelocationRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = StockRelocationRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        Ok(())
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stock_relocation::table.filter(stock_relocation::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = match StockRelocationRow::generate_changelog(
            RowOrId::Id(id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        ) {
            Ok(changelog) => changelog,
            Err(RepositoryError::NotFound) => return Ok(()),
            Err(e) => return Err(e),
        };
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        self._delete(id)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StockRelocationRow>, RepositoryError> {
        let result = stock_relocation::table
            .filter(stock_relocation::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<StockRelocationRow>, RepositoryError> {
        let result = stock_relocation::table
            .filter(stock_relocation::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct StockRelocationRowDelete(pub String);
impl Delete for StockRelocationRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                StockRelocationRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        StockRelocationRowRepository::new(con)._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StockRelocationRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StockRelocationRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        StockRelocationRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                StockRelocationRow::generate_changelog(
                    RowOrId::Row(self),
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StockRelocationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
