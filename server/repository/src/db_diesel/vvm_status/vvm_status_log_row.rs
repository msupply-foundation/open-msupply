use super::vvm_status_log_row::vvm_status_log::dsl::*;
use crate::{
    db_diesel::{invoice_line_row::invoice_line, stock_line_row::stock_line, store_row::store},
    ChangeLogInsertRow, ChangelogRepository, ChangelogSyncType, ChangelogTableName, Delete,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    vvm_status_log (id) {
        id -> Text,
        status_id -> Text,
        created_datetime -> Timestamp,
        stock_line_id -> Text,
        comment -> Nullable<Text>,
        created_by -> Text,
        invoice_line_id -> Nullable<Text>,
        store_id -> Text
    }
}

joinable!(vvm_status_log -> stock_line (stock_line_id));
joinable!(vvm_status_log -> invoice_line (invoice_line_id));
joinable!(vvm_status_log -> store (store_id));

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = vvm_status_log)]
pub struct VVMStatusLogRow {
    pub id: String,
    pub status_id: String,
    pub created_datetime: NaiveDateTime,
    pub stock_line_id: String,
    pub comment: Option<String>,
    pub created_by: String,
    pub invoice_line_id: Option<String>,
    pub store_id: String,
}

impl VVMStatusLogRow {
    pub(crate) fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::VVMStatusLog,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            name_id: None,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }

    pub(crate) fn delete_changelog(
        row_id: &str,
        con: &StorageConnection,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = VVMStatusLogRowRepository::new(con)
            .find_one_by_id(row_id)?
            .ok_or(RepositoryError::NotFound)?;
        row.changelog(con, RowActionType::Delete, source_site_id)
    }
}

pub struct VVMStatusLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VVMStatusLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VVMStatusLogRowRepository { connection }
    }

    pub fn find_one_by_id(&self, log_id: &str) -> Result<Option<VVMStatusLogRow>, RepositoryError> {
        let result = vvm_status_log
            .filter(id.eq(log_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_stock_line_id(
        &self,
        line_id: &str,
    ) -> Result<Vec<VVMStatusLogRow>, RepositoryError> {
        let result = vvm_status_log::table
            .filter(vvm_status_log::stock_line_id.eq(line_id))
            .order(vvm_status_log::created_datetime.desc())
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn _upsert_one(&self, row: &VVMStatusLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(vvm_status_log::table)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &VVMStatusLogRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn delete(&self, log_id: &str) -> Result<Option<i64>, RepositoryError> {
        let changelog = match VVMStatusLogRow::delete_changelog(
            log_id,
            self.connection,
            SourceSiteId::CurrentSiteId,
        ) {
            Ok(changelog) => changelog,
            Err(RepositoryError::NotFound) => return Ok(None),
            Err(e) => return Err(e),
        };
        let change_log_id = ChangelogRepository::new(self.connection).insert(&changelog)?;
        diesel::delete(vvm_status_log.filter(id.eq(log_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }
}

#[derive(Debug, Clone)]
pub struct VVMStatusLogRowDelete(pub String);

impl Delete for VVMStatusLogRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                VVMStatusLogRow::delete_changelog(
                    &self.0,
                    con,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(vvm_status_log.filter(id.eq(&self.0))).execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            VVMStatusLogRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for VVMStatusLogRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        VVMStatusLogRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.changelog(
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test Only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VVMStatusLogRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
