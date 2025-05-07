use super::vvm_status_log_row::vvm_status_log::dsl::*;
use crate::Upsert;
use crate::{
    db_diesel::{invoice_line_row::invoice_line, stock_line_row::stock_line},
    RepositoryError, StorageConnection,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    vvm_status_log (id) {
        id -> Text,
        status_id -> Text,
        datetime -> Nullable<Timestamp>,
        stock_line_id -> Text,
        comment -> Nullable<Text>,
        user_id -> Text,
        invoice_line_id -> Text,
    }
}

joinable!(vvm_status_log -> stock_line (stock_line_id));
joinable!(vvm_status_log -> invoice_line (invoice_line_id));

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = vvm_status_log)]
pub struct VVMStatusLogRow {
    pub id: String,
    pub status_id: String,
    pub datetime: Option<NaiveDateTime>,
    pub stock_line_id: String,
    pub comment: Option<String>,
    pub user_id: String,
    pub invoice_line_id: String,
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

    pub fn find_all(&self) -> Result<Vec<VVMStatusLogRow>, RepositoryError> {
        let result = vvm_status_log.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_stock_line_id(
        &self,
        line_id: &str,
    ) -> Result<Vec<VVMStatusLogRow>, RepositoryError> {
        let result = vvm_status_log::table
            .filter(vvm_status_log::stock_line_id.eq(line_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn upsert_one(&self, row: &VVMStatusLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(vvm_status_log::table)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    // pub insert_changelog() {}
}

impl Upsert for VVMStatusLogRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        VVMStatusLogRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog yet
    }

    // Test Only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VVMStatusLogRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
