use super::sync_file_reference_row::sync_file_reference::dsl::*;

use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    sync_file_reference (id) {
        id -> Text,
        table_name -> crate::db_diesel::changelog::ChangelogTableNameMapping,
        record_id -> Text,
        file_name -> Text,
        created_datetime -> Timestamp,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, Serialize, Deserialize,
)]
#[table_name = "sync_file_reference"]
pub struct SyncFileReferenceRow {
    pub id: String,
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub file_name: String,
    pub created_datetime: NaiveDateTime,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct SyncFileReferenceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncFileReferenceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncFileReferenceRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(sync_file_reference)
            .values(sync_file_reference_row)
            .on_conflict(id)
            .do_update()
            .set(sync_file_reference_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(sync_file_reference)
            .values(sync_file_reference_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        sync_file_reference_id: &str,
    ) -> Result<Option<SyncFileReferenceRow>, RepositoryError> {
        let result = sync_file_reference
            .filter(id.eq(sync_file_reference_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, sync_file_reference_id: &str) -> Result<(), RepositoryError> {
        diesel::update(sync_file_reference.filter(id.eq(sync_file_reference_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
