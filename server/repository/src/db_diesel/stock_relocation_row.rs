use super::{item_row::item, stock_line_row::stock_line, StorageConnection};

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
        created_datetime -> Timestamp,
        finalised_datetime -> Nullable<Timestamp>,
        from_stock_line_id -> Text,
        from_location_id -> Nullable<Text>,
        from_number_of_packs -> Double,
        to_stock_line_id -> Nullable<Text>,
        to_location_id -> Nullable<Text>,
        to_pack_size -> Nullable<Double>,
        status -> crate::db_diesel::stock_relocation_row::StockRelocationStatusMapping,
        store_id -> Text,
        user_id -> Text,
    }
}

joinable!(stock_relocation -> stock_line (from_stock_line_id));
allow_tables_to_appear_in_same_query!(stock_relocation, stock_line);
allow_tables_to_appear_in_same_query!(stock_relocation, item);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StockRelocationStatus {
    #[default]
    New,
    Finalised,
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = stock_relocation)]
pub struct StockRelocationRow {
    pub id: String,
    pub created_datetime: NaiveDateTime,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub from_stock_line_id: String,
    pub from_location_id: Option<String>,
    pub from_number_of_packs: f64,
    pub to_stock_line_id: Option<String>,
    pub to_location_id: Option<String>,
    pub to_pack_size: Option<f64>,
    pub status: StockRelocationStatus,
    pub store_id: String,
    pub user_id: String,
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
// For tests only
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
