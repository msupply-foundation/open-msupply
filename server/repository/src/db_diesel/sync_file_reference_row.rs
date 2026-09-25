use super::sync_file_reference_row::sync_file_reference::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use crate::SourceSiteId;
use crate::{ChangelogRepository, ChangelogSyncType, RowActionType, Upsert};

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
        user_id -> Nullable<Text>,
        version_number -> Integer,
    }
}

pub fn first_version() -> i32 {
    1
}

// Local/synced split lives in `SyncFileReferenceWire` (below). Anything absent
// from the wire DTO is local-only by construction; the pull translator merges
// the wire payload over an existing row to preserve those local fields.
#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
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
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default = "first_version")]
    pub version_number: i32,
}

// Not derived: a built row is the FIRST version of its name, not version zero,
// or a row that never sets the field sits below the numbers
// `next_version_number` goes on to issue.
impl Default for SyncFileReferenceRow {
    fn default() -> Self {
        SyncFileReferenceRow {
            id: Default::default(),
            table_name: Default::default(),
            record_id: Default::default(),
            file_name: Default::default(),
            mime_type: Default::default(),
            uploaded_bytes: Default::default(),
            downloaded_bytes: Default::default(),
            total_bytes: Default::default(),
            retries: Default::default(),
            retry_at: Default::default(),
            direction: Default::default(),
            status: Default::default(),
            error: Default::default(),
            created_datetime: Default::default(),
            deleted_datetime: Default::default(),
            user_id: Default::default(),
            version_number: first_version(),
        }
    }
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
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default = "first_version")]
    pub version_number: i32,
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
            user_id: row.user_id.clone(),
            version_number: row.version_number,
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
            user_id: self.user_id,
            version_number: self.version_number,
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

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<SyncFileReferenceRow>, RepositoryError> {
        Ok(sync_file_reference::table
            .filter(sync_file_reference::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// Highest version of `name` on the record (deleted included) + 1, so numbers are never reissued.
    ///
    /// Not unique by itself: read and claimed in one transaction by the upload
    /// (`server/static_files.rs`), but a number is only ever the highest THIS
    /// site has seen, so two sites attaching the same name to the same record
    /// independently both reach the same number. Nothing rejects a duplicate;
    /// readers order on the number and break ties elsewhere.
    pub fn next_version_number(
        &self,
        table: &str,
        record: &str,
        name: &str,
    ) -> Result<i32, RepositoryError> {
        let highest: Option<i32> = sync_file_reference
            .filter(table_name.eq(table))
            .filter(record_id.eq(record))
            .filter(file_name.eq(name))
            .select(diesel::dsl::max(version_number))
            .first(self.connection.lock().connection())?;
        Ok(highest.unwrap_or(0) + 1)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all};

    fn version(file_id: &str, name: &str, number: i32) -> SyncFileReferenceRow {
        SyncFileReferenceRow {
            id: file_id.to_string(),
            table_name: "purchase_order".to_string(),
            record_id: "po1".to_string(),
            file_name: name.to_string(),
            version_number: number,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn next_version_number_skips_deleted_versions() {
        let (_, connection, _, _) = setup_all(
            "sync_file_reference_next_version_number",
            MockDataInserts::none(),
        )
        .await;
        let repo = SyncFileReferenceRowRepository::new(&connection);

        assert_eq!(
            repo.next_version_number("purchase_order", "po1", "po.pdf"),
            Ok(1)
        );

        for (file_id, number) in [("v1", 1), ("v2", 2), ("v3", 3), ("v4", 4)] {
            repo.upsert_one(&version(file_id, "po.pdf", number))
                .unwrap();
        }
        repo.delete("v3").unwrap();

        // deleted v3 still holds its number
        assert_eq!(
            repo.next_version_number("purchase_order", "po1", "po.pdf"),
            Ok(5)
        );

        assert_eq!(
            repo.next_version_number("purchase_order", "po1", "quote.pdf"),
            Ok(1)
        );
        assert_eq!(
            repo.next_version_number("purchase_order", "po2", "po.pdf"),
            Ok(1)
        );
    }

    // Guards a re-derived `Default`: the support-log uploads take
    // `..Default::default()` and never name a version.
    #[actix_rt::test]
    async fn a_built_row_is_the_first_version_of_its_name() {
        assert_eq!(
            SyncFileReferenceRow::default().version_number,
            first_version()
        );

        let (_, connection, _, _) = setup_all(
            "sync_file_reference_default_version_number",
            MockDataInserts::none(),
        )
        .await;
        let repo = SyncFileReferenceRowRepository::new(&connection);

        repo.upsert_one(&SyncFileReferenceRow {
            id: "process-attached".to_string(),
            table_name: "purchase_order".to_string(),
            record_id: "po1".to_string(),
            file_name: "log.txt".to_string(),
            ..Default::default()
        })
        .unwrap();

        // Version 1, and the next upload of the name follows it
        assert_eq!(
            repo.find_one_by_id("process-attached")
                .unwrap()
                .unwrap()
                .version_number,
            1
        );
        assert_eq!(
            repo.next_version_number("purchase_order", "po1", "log.txt"),
            Ok(2)
        );
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
