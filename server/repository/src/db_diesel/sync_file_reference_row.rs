use super::sync_file_reference_row::sync_file_reference::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use crate::SourceSiteId;
use crate::{
    ChangelogRepository, ChangelogSyncType, RowActionType,
    Upsert,
};

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

// Local/synced split lives in `SyncFileReferenceWire` (below). Anything absent
// from the wire DTO is local-only by construction; the pull translator merges
// the wire payload over an existing row to preserve those local fields.
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

/// Subset of `SyncFileReferenceRow` that crosses sync. Anything not listed here
/// is local-only per-site state (retry counters, transfer progress, direction).
/// On pull, [`Self::into_row`] merges the wire payload over the existing local row
/// so a status sync from central never clobbers our own bookkeeping.
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncFileReferenceWire {
    pub id: String,
    pub table_name: String,
    pub record_id: String,
    pub file_name: String,
    #[serde(default)]
    pub mime_type: Option<String>,
    #[serde(default)]
    pub total_bytes: i32,
    #[serde(default)]
    pub status: SyncFileStatus,
    #[serde(default)]
    pub error: Option<String>,
    pub created_datetime: NaiveDateTime,
    #[serde(default)]
    pub deleted_datetime: Option<NaiveDateTime>,
}

impl SyncFileReferenceWire {
    pub fn from_row(row: &SyncFileReferenceRow) -> Self {
        SyncFileReferenceWire {
            id: row.id.clone(),
            table_name: row.table_name.clone(),
            record_id: row.record_id.clone(),
            file_name: row.file_name.clone(),
            mime_type: row.mime_type.clone(),
            total_bytes: row.total_bytes,
            status: row.status.clone(),
            error: row.error.clone(),
            created_datetime: row.created_datetime,
            deleted_datetime: row.deleted_datetime,
        }
    }

    pub fn into_row(self, existing: Option<SyncFileReferenceRow>) -> SyncFileReferenceRow {
        let local = existing.unwrap_or_default();
        SyncFileReferenceRow {
            id: self.id,
            table_name: self.table_name,
            record_id: self.record_id,
            file_name: self.file_name,
            mime_type: self.mime_type,
            total_bytes: self.total_bytes,
            status: self.status,
            error: self.error,
            created_datetime: self.created_datetime,
            deleted_datetime: self.deleted_datetime,
            // Local-only fields preserved from the existing row.
            uploaded_bytes: local.uploaded_bytes,
            downloaded_bytes: local.downloaded_bytes,
            retries: local.retries,
            retry_at: local.retry_at,
            direction: local.direction,
        }
    }
}

pub struct SyncFileReferenceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncFileReferenceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncFileReferenceRowRepository { connection }
    }

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

    pub fn upsert_one(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(sync_file_reference_row)?;
        let changelog = SyncFileReferenceRow::generate_changelog(
            sync_file_reference_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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
        let changelog = SyncFileReferenceRow::generate_changelog(
            sync_file_reference_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        Ok(())
    }

    /// Every live reference belonging to one owning record — e.g. a front-end bundle's
    /// dist zip, or an invoice's attachments. Excludes soft-deleted rows.
    pub fn find_all_by_record_id(
        &self,
        owning_record_id: &str,
    ) -> Result<Vec<SyncFileReferenceRow>, RepositoryError> {
        let result = sync_file_reference
            .filter(deleted_datetime.is_null())
            .filter(record_id.eq(owning_record_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
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
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    /// Persists the row WITHOUT producing a changelog entry, so the change is not synced to
    /// other sites. Use only for transitions that are meaningful only locally:
    ///
    /// - `status = InProgress` (an in-flight flicker that's about to settle to `Done`/`Error`)
    /// - Bumping `retries` / `retry_at` between failed attempts
    /// - Updating `uploaded_bytes` / `downloaded_bytes` mid-transfer
    ///
    /// For terminal transitions (`Done`, `Error`, `PermanentFailure`) or any change to `error`,
    /// call `upsert_one` instead so the outcome propagates to central / other sites — see
    /// `SyncFileReferenceWire` for which fields cross the wire.
    pub fn upsert_without_changelog(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(sync_file_reference_row)?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<SyncFileReferenceRow>, RepositoryError> {
        Ok(sync_file_reference::table
            .filter(sync_file_reference::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for SyncFileReferenceRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        SyncFileReferenceRowRepository::new(con)._upsert_one(self)?;

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
            SyncFileReferenceRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
