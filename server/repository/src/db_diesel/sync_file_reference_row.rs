use super::sync_file_reference_row::sync_file_reference::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::{ChangeLogInsertRow, ChangelogAction, ChangelogRepository, ChangelogTableName, Upsert};

table! {
    sync_file_reference (id) {
        id -> Text,
        table_name -> Text,
        record_id -> Text,
        file_name -> Text,
        mime_type -> Nullable<Text>,
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
    pub table_name: String,
    pub record_id: String,
    pub file_name: String,
    pub mime_type: Option<String>,
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
    fn _upsert_one(
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
    fn _upsert_one(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(sync_file_reference)
            .values(sync_file_reference_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(sync_file_reference_row)?;
        self.insert_changelog(
            sync_file_reference_row.id.to_owned(),
            ChangelogAction::Upsert,
        )
    }

    fn insert_changelog(
        &self,
        sync_file_reference_id: String,
        action: ChangelogAction,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::SyncFileReference,
            record_id: sync_file_reference_id,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
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
        self.insert_changelog(sync_file_reference_id.to_owned(), ChangelogAction::Upsert)?; // Should be delete but since we have soft delete this works (for now)
        Ok(())
    }
}

impl Upsert for SyncFileReferenceRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = SyncFileReferenceRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        // We'll return the later changelog id, as that's the one that will be marked as coming from this site...
        let cursor_id = SyncFileReferenceRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            SyncFileReferenceRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
