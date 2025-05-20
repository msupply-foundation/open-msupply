use super::vvm_status_log_row::vvm_status_log::dsl::*;
use crate::{
    db_diesel::{invoice_line_row::invoice_line, stock_line_row::stock_line, store_row::store},
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, Delete, RepositoryError,
    RowActionType, StorageConnection, Upsert,
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

    pub fn upsert_one(&self, row: &VVMStatusLogRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(vvm_status_log::table)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    pub fn delete(&self, log_id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(log_id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(&old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };
        diesel::delete(vvm_status_log.filter(id.eq(log_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    fn insert_changelog(
        &self,
        row: &VVMStatusLogRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::VVMStatusLog,
            record_id: row.id.to_string(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }
}

#[derive(Debug, Clone)]
pub struct VVMStatusLogRowDelete(pub String);

impl Delete for VVMStatusLogRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        VVMStatusLogRowRepository::new(con).delete(&self.0)
    }

    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            VVMStatusLogRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for VVMStatusLogRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = VVMStatusLogRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log))
    }

    // Test Only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VVMStatusLogRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
