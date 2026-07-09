use super::{
    item_row::item, location_row::location, stock_line_row::stock_line,
    stock_relocation_row::stock_relocation, StorageConnection,
};

use crate::db_diesel::changelog::changelog::RowOrId;
use crate::Upsert;
use crate::{repository_error::RepositoryError, Delete};
use crate::{ChangelogRepository, ChangelogSyncType, RowActionType, SourceSiteId};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    stock_relocation_line (id) {
        id -> Text,
        stock_relocation_id -> Text,
        stock_line_id -> Text,
        destination_stock_line_id -> Nullable<Text>,
        source_location_id -> Nullable<Text>,
        destination_location_id -> Nullable<Text>,
        number_of_packs -> Double,
    }
}

joinable!(stock_relocation_line -> stock_relocation (stock_relocation_id));
allow_tables_to_appear_in_same_query!(stock_relocation_line, stock_relocation);
allow_tables_to_appear_in_same_query!(stock_relocation_line, stock_line);
allow_tables_to_appear_in_same_query!(stock_relocation_line, item);
allow_tables_to_appear_in_same_query!(stock_relocation_line, location);

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = stock_relocation_line)]
pub struct StockRelocationLineRow {
    pub id: String,
    pub stock_relocation_id: String,
    pub stock_line_id: String,
    pub destination_stock_line_id: Option<String>,
    pub source_location_id: Option<String>,
    pub destination_location_id: Option<String>,
    pub number_of_packs: f64,
}

pub struct StockRelocationLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockRelocationLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockRelocationLineRowRepository { connection }
    }

    fn _upsert(&self, row: &StockRelocationLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stock_relocation_line::table)
            .values(row)
            .on_conflict(stock_relocation_line::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &StockRelocationLineRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = StockRelocationLineRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        Ok(())
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stock_relocation_line::table.filter(stock_relocation_line::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = match StockRelocationLineRow::generate_changelog(
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

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<StockRelocationLineRow>, RepositoryError> {
        let result = stock_relocation_line::table
            .filter(stock_relocation_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<StockRelocationLineRow>, RepositoryError> {
        let result = stock_relocation_line::table
            .filter(stock_relocation_line::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_stock_relocation_id(
        &self,
        stock_relocation_id: &str,
    ) -> Result<Vec<StockRelocationLineRow>, RepositoryError> {
        let result = stock_relocation_line::table
            .filter(stock_relocation_line::stock_relocation_id.eq(stock_relocation_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_stock_relocation_ids(
        &self,
        stock_relocation_ids: &[String],
    ) -> Result<Vec<StockRelocationLineRow>, RepositoryError> {
        let result = stock_relocation_line::table
            .filter(stock_relocation_line::stock_relocation_id.eq_any(stock_relocation_ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct StockRelocationLineRowDelete(pub String);
impl Delete for StockRelocationLineRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                StockRelocationLineRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        StockRelocationLineRowRepository::new(con)._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StockRelocationLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StockRelocationLineRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        StockRelocationLineRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                StockRelocationLineRow::generate_changelog(
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
            StockRelocationLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
