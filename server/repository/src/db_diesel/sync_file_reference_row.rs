use super::sync_file_reference_row::sync_file_reference::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use crate::{ChangeLogInsertRow, ChangelogAction, ChangelogRepository, ChangelogTableName, Upsert};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncFileStatus {
    #[default]
    New,
    InProgress,
    Error,
    Done,
    PermanentFailure, // Failed will not be re-tried
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncFileDirection {
    Upload,
    #[default]
    Download, // Download is the default as this is the direction we want for new record via sync, which will be defaulted
}

table! {
    sync_file_reference (id) {
        id -> Text,
        table_name -> Text,
        record_id -> Text,
        file_name -> Text,
        mime_type -> Nullable<Text>,
        uploaded_bytes -> Integer,
        downloaded_bytes -> Integer,
        total_bytes -> Integer,
        retries -> Integer,
        retry_at -> Nullable<Timestamp>,
        direction -> crate::db_diesel::sync_file_reference_row::SyncFileDirectionMapping,
        status -> crate::db_diesel::sync_file_reference_row::SyncFileStatusMapping,
        error -> Nullable<Text>,
        created_datetime -> Timestamp,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = sync_file_reference)]
pub struct SyncFileReferenceRow {
    pub id: String,
    pub table_name: String,
    pub record_id: String,
    pub file_name: String,
    pub mime_type: Option<String>,
    #[serde(skip_serializing)]
    #[serde(default)]
    pub uploaded_bytes: i32,
    #[serde(skip_serializing)]
    #[serde(default)]
    pub downloaded_bytes: i32,
    #[serde(default)]
    pub total_bytes: i32,
    #[serde(skip_serializing)]
    #[serde(default)]
    pub retries: i32,
    #[serde(skip_serializing)]
    #[serde(default)]
    pub retry_at: Option<NaiveDateTime>,
    #[serde(skip_serializing)]
    #[serde(default)]
    pub direction: SyncFileDirection,
    #[serde(skip_serializing)]
    #[serde(default)]
    pub status: SyncFileStatus,
    #[serde(skip_serializing)]
    #[serde(default)]
    pub error: Option<String>,
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
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(sync_file_reference)
            .values(sync_file_reference_row)
            .execute(self.connection.lock().connection())?;
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
            ..Default::default()
        };

        ChangelogRepository::new(&self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        sync_file_reference_id: &str,
    ) -> Result<Option<SyncFileReferenceRow>, RepositoryError> {
        let result = sync_file_reference
            .filter(id.eq(sync_file_reference_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, sync_file_reference_id: &str) -> Result<(), RepositoryError> {
        diesel::update(sync_file_reference.filter(id.eq(sync_file_reference_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(sync_file_reference_id.to_owned(), ChangelogAction::Delete)?;
        Ok(())
    }

    pub fn find_all_to_upload(&self) -> Result<Vec<SyncFileReferenceRow>, RepositoryError> {
        // NOTE: InProgress status here as the behaviour is a bit undefined. We should either upload a whole file or get an error.
        // It's included here in case the server is restarted with an Inprogress file, it will be re-tried.
        let result = sync_file_reference
            .filter(deleted_datetime.is_null())
            .filter(direction.eq(SyncFileDirection::Upload))
            .filter(
                status
                    .eq(SyncFileStatus::New)
                    .or(status.eq(SyncFileStatus::InProgress))
                    .or(status
                        .eq(SyncFileStatus::Error)
                        .and(retry_at.lt(diesel::dsl::now))),
            )
            .load(&self.connection.connection)?;
        Ok(result)
    }

    // Note this deliberately doesn't create change log records to avoid triggering sync updates to central server for local only information
    pub fn update_status(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(sync_file_reference_row)?;
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
