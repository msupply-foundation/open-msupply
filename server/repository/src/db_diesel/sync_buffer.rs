use std::{ops::Deref, str::FromStr};

use super::StorageConnection;
use crate::{
    diesel_macros::{diesel_json_type, diesel_string_enum},
    migrations::Version,
    repository_error::RepositoryError,
    KeyType, KeyValueStoreRepository,
};
use chrono::{NaiveDateTime, Utc};
use diesel::prelude::*;
use serde::{de::DeserializeOwned, Deserialize, Serialize};

diesel_string_enum! {
    #[derive(Clone, Eq)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    pub enum SyncAction {
        #[default]
        Upsert,
        Delete,
        Merge,
    }
}

diesel_string_enum! {
    #[derive(Clone, Copy, Eq)]
    pub enum SyncVersion {
        #[default]
        #[strum(serialize = "V5_V6")]
        V5V6,
        V7,
    }
}

impl SyncVersion {
    /// Single source of truth for which sync flow this site should run.
    /// `is_central` is passed by the caller (`CentralServerConfig::is_central_server()`
    /// lives in the `service` crate) — when true, V5V6 is forced regardless of the
    /// stored value.
    pub fn get(
        connection: &StorageConnection,
        is_central: bool,
    ) -> Result<SyncVersion, RepositoryError> {
        if is_central {
            return Ok(SyncVersion::V5V6);
        }
        let raw =
            KeyValueStoreRepository::new(connection).get_string(KeyType::SettingsSyncVersion)?;
        Ok(raw
            .and_then(|s| SyncVersion::from_str(&s).ok())
            .unwrap_or_default())
    }

    pub fn set(
        connection: &StorageConnection,
        version: SyncVersion,
    ) -> Result<(), RepositoryError> {
        KeyValueStoreRepository::new(connection)
            .set_string(KeyType::SettingsSyncVersion, Some(version.to_string()))
    }

    /// Parse the free-text `sync_version` field from the legacy server (4D
    /// site row, v5 site_info response, etc). Anything other than "v7"
    /// (case-insensitive, trimmed) — including empty, missing, or unknown —
    /// maps to V5V6.
    pub fn from_legacy_string(raw: Option<&str>) -> SyncVersion {
        match raw.map(str::trim).map(str::to_ascii_lowercase).as_deref() {
            Some("v7") => SyncVersion::V7,
            _ => SyncVersion::V5V6,
        }
    }
}

diesel_string_enum! {
    #[derive(Clone, Copy, Eq)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    pub enum IntegrationResult {
        #[default]
        Success,
        Error,
        Ignored,
    }
}

diesel_json_type! {
    #[derive(Clone, Debug, Default, PartialEq)]
    pub struct SyncRecordData(pub serde_json::Value);
}

impl Deref for SyncRecordData {
    type Target = serde_json::Value;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

diesel_json_type! {
    #[derive(Clone, Debug, PartialEq)]
    pub struct AppVersion(pub Version);
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CursorDirection {
    Asc,
    Desc,
}

table! {
    sync_buffer (cursor) {
        cursor -> Integer,
        record_id -> Text,
        received_datetime -> Timestamp,
        integration_started_datetime -> Nullable<Timestamp>,
        integration_datetime -> Nullable<Timestamp>,
        integration_error -> Nullable<Text>,
        integration_result -> Nullable<Text>,
        table_name -> Text,
        action -> Text,
        data -> Text,
        sync_version -> Text,
        app_version -> Nullable<Text>,
        source_site_id -> Integer,
        store_id -> Nullable<Text>,
        transfer_store_id -> Nullable<Text>,
        patient_id -> Nullable<Text>,
        reference_id -> Nullable<Text>,
        is_integrated -> Bool,
    }
}

#[derive(Clone, Queryable, Serialize, Deserialize, Debug, PartialEq, Default)]
pub struct SyncBufferRow {
    #[serde(default)]
    pub cursor: i32,
    pub record_id: String,
    pub received_datetime: NaiveDateTime,
    #[serde(default)]
    pub integration_started_datetime: Option<NaiveDateTime>,
    pub integration_datetime: Option<NaiveDateTime>,
    pub integration_error: Option<String>,
    #[serde(default)]
    pub integration_result: Option<IntegrationResult>,
    pub table_name: String,
    pub action: SyncAction,
    pub data: SyncRecordData,
    #[serde(default)]
    pub sync_version: SyncVersion,
    #[serde(default)]
    pub app_version: Option<AppVersion>,
    pub source_site_id: i32,
    #[serde(default)]
    pub store_id: Option<String>,
    #[serde(default)]
    pub transfer_store_id: Option<String>,
    #[serde(default)]
    pub patient_id: Option<String>,
    /// Logical FK to sync_request.reference_id. Set by the v7 sync layer
    /// when a sync_request is run; identifies which run produced this row
    /// so integrate can scope its work to that run on retry.
    #[serde(default)]
    pub reference_id: Option<String>,
    #[serde(default)]
    pub is_integrated: bool,
}

impl SyncBufferRow {
    pub fn deserialize<T: DeserializeOwned>(&self) -> Result<T, serde_json::Error> {
        serde_json::from_value(self.data.0.clone())
    }
}

/// Insert shape for `sync_buffer` — `cursor` is auto-assigned by the DB
/// (SERIAL on Postgres / INTEGER PRIMARY KEY AUTOINCREMENT on SQLite).
#[derive(Clone, Insertable, Debug, PartialEq, Default)]
#[diesel(table_name = sync_buffer)]
pub struct SyncBufferRowInsert {
    pub record_id: String,
    pub received_datetime: NaiveDateTime,
    pub table_name: String,
    pub action: SyncAction,
    pub data: SyncRecordData,
    pub sync_version: SyncVersion,
    pub app_version: Option<AppVersion>,
    pub source_site_id: i32,
    pub store_id: Option<String>,
    pub transfer_store_id: Option<String>,
    pub patient_id: Option<String>,
    pub reference_id: Option<String>,
}

/// Number of columns inserted per `SyncBufferRowInsert` (keep in sync with the
/// struct above). Used to bound the insert batch under the bind-parameter limit.
const SYNC_BUFFER_COLUMNS: usize = 12;
/// The active backend's limit on bind parameters per statement. Mirrors the
/// backend selection in `db_diesel` (postgres feature wins when both are on).
///
/// Only the postgres value matters in practice. Postgres inserts every row in
/// one statement (`rows * columns` parameters), so a large batch can go over
/// 65535. On SQLite, diesel inserts one row at a time (12 parameters each), so
/// this limit is never reached — the SQLite value is here is for consistency
#[cfg(feature = "postgres")]
const MAX_BIND_PARAMS: usize = 65535;
#[cfg(not(feature = "postgres"))]
const MAX_BIND_PARAMS: usize = 32766;
/// Rows per insert statement, so `rows * columns` stays under the limit. A large
/// pull batch (e.g. remote_pull = 10000 → 120k params) would otherwise overflow
/// a single insert.
const INSERT_CHUNK_SIZE: usize = MAX_BIND_PARAMS / SYNC_BUFFER_COLUMNS;

impl From<SyncBufferRow> for SyncBufferRowInsert {
    fn from(row: SyncBufferRow) -> Self {
        SyncBufferRowInsert {
            record_id: row.record_id,
            received_datetime: row.received_datetime,
            table_name: row.table_name,
            action: row.action,
            data: row.data,
            sync_version: row.sync_version,
            app_version: row.app_version,
            source_site_id: row.source_site_id,
            store_id: row.store_id,
            transfer_store_id: row.transfer_store_id,
            patient_id: row.patient_id,
            reference_id: row.reference_id,
        }
    }
}

pub struct PendingQuery<'a> {
    pub source_site_id: i32,
    pub sync_version: SyncVersion,
    pub reference_id: Option<&'a str>,
    pub table_name: &'a str,
    pub action: SyncAction,
    pub direction: CursorDirection,
    pub limit: i64,
}

pub struct SyncBufferRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncBufferRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncBufferRepository { connection }
    }

    /// The only insertion path. Cursor is auto-assigned per row. Chunked to stay
    /// under the bind-parameter limit (see `INSERT_CHUNK_SIZE`).
    pub fn insert_many(&self, rows: &[SyncBufferRowInsert]) -> Result<(), RepositoryError> {
        for chunk in rows.chunks(INSERT_CHUNK_SIZE) {
            diesel::insert_into(sync_buffer::table)
                .values(chunk)
                .execute(self.connection.lock().connection())?;
        }
        Ok(())
    }

    /// The only filtered list query. Always filters `is_integrated = false`,
    /// orders by `cursor` in the requested direction, and returns all matching rows.
    pub fn pending_ordered_by_cursor(
        &self,
        query: PendingQuery,
    ) -> Result<Vec<SyncBufferRow>, RepositoryError> {
        let PendingQuery {
            source_site_id,
            sync_version,
            reference_id,
            table_name,
            action,
            direction,
            limit,
        } = query;

        let mut q = sync_buffer::table
            .filter(sync_buffer::is_integrated.eq(false))
            .filter(sync_buffer::sync_version.eq(sync_version))
            .filter(sync_buffer::table_name.eq(table_name.to_string()))
            .filter(sync_buffer::action.eq(action))
            .filter(sync_buffer::source_site_id.eq(source_site_id))
            .limit(limit)
            .into_boxed();

        if let Some(reference_id) = reference_id {
            q = q.filter(sync_buffer::reference_id.eq(reference_id.to_string()));
        } else {
            q = q.filter(sync_buffer::reference_id.is_null());
        }

        let rows = match direction {
            CursorDirection::Asc => q
                .order(sync_buffer::cursor.asc())
                .load(self.connection.lock().connection())?,
            CursorDirection::Desc => q
                .order(sync_buffer::cursor.desc())
                .load(self.connection.lock().connection())?,
        };

        Ok(rows)
    }

    /// Total pending rows across all tables and actions, for the given
    /// source/version/reference_id. Used for progress reporting.
    ///
    /// `table_names`, when given, restricts the count to those tables. Integration only
    /// visits tables it has translators for, so the buffer can hold rows (e.g. legacy
    /// tables with no translator) that will never integrate — pass the set of tables
    /// integration will actually visit so those rows don't report as forever-pending.
    pub fn count_pending(
        &self,
        source_site_id: i32,
        sync_version: SyncVersion,
        reference_id: Option<&str>,
        table_names: Option<&[&str]>,
    ) -> Result<i64, RepositoryError> {
        let mut q = sync_buffer::table
            .filter(sync_buffer::is_integrated.eq(false))
            .filter(sync_buffer::sync_version.eq(sync_version))
            .filter(sync_buffer::source_site_id.eq(source_site_id))
            .into_boxed();

        if let Some(reference_id) = reference_id {
            q = q.filter(sync_buffer::reference_id.eq(reference_id.to_string()));
        } else {
            q = q.filter(sync_buffer::reference_id.is_null());
        }

        if let Some(table_names) = table_names {
            let table_names: Vec<String> = table_names.iter().map(|s| s.to_string()).collect();
            q = q.filter(sync_buffer::table_name.eq_any(table_names));
        }

        let count: i64 = q.count().get_result(self.connection.lock().connection())?;
        Ok(count)
    }

    /// Records the outcome of integrating a single buffer row.
    ///
    /// `started_datetime` is captured by the caller immediately before integration begins
    /// and passed in here once integration completes (success, error, or ignored). Sets
    /// `is_integrated = true`, which moves the row out of the pending partition (PG) and
    /// drops it from the partial pending index (SQLite).
    pub fn set_integration_result(
        &self,
        cursor: i32,
        started_datetime: NaiveDateTime,
        result: IntegrationResult,
        error: Option<&str>,
    ) -> Result<(), RepositoryError> {
        diesel::update(sync_buffer::table.filter(sync_buffer::cursor.eq(cursor)))
            .set((
                sync_buffer::integration_started_datetime.eq(Some(started_datetime)),
                sync_buffer::integration_datetime.eq(Some(Utc::now().naive_utc())),
                sync_buffer::integration_result.eq(Some(result)),
                sync_buffer::integration_error.eq(error.map(|s| s.to_string())),
                sync_buffer::is_integrated.eq(true),
            ))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Returns the most recent (highest cursor) row matching the record_id, across both
    /// pending and integrated rows.
    ///
    /// SLOW — there is no index on `sync_buffer.record_id`, so this is a full-table scan
    /// ordered by cursor. Test/diagnostic use only; do not call from translators or any other
    /// hot path (it was a measurable slow-down on integration).
    pub fn find_latest_by_record_id_slow_unindexed(
        &self,
        record_id: &str,
    ) -> Result<Option<SyncBufferRow>, RepositoryError> {
        let result = sync_buffer::table
            .filter(sync_buffer::record_id.eq(record_id))
            .order(sync_buffer::cursor.desc())
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn get_all(&self) -> Result<Vec<SyncBufferRow>, RepositoryError> {
        Ok(sync_buffer::table
            .order(sync_buffer::cursor.asc())
            .load(self.connection.lock().connection())?)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{mock::MockDataInserts, test_db};

    fn insert(record_id: &str, table_name: &str) -> SyncBufferRowInsert {
        SyncBufferRowInsert {
            record_id: record_id.to_string(),
            table_name: table_name.to_string(),
            action: SyncAction::Upsert,
            data: SyncRecordData(serde_json::json!({})),
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn test_sync_buffer_insert_and_query() {
        let (_, connection, _, _) =
            test_db::setup_all("test_sync_buffer_insert_and_query", MockDataInserts::none()).await;

        let repo = SyncBufferRepository::new(&connection);

        // Insert four rows in order — cursor must reflect insertion order
        repo.insert_many(&[
            SyncBufferRowInsert {
                source_site_id: 1,
                sync_version: SyncVersion::V5V6,
                ..insert("a1", "store")
            },
            SyncBufferRowInsert {
                source_site_id: 1,
                sync_version: SyncVersion::V5V6,
                ..insert("a2", "store")
            },
            SyncBufferRowInsert {
                source_site_id: 2,
                sync_version: SyncVersion::V7,
                ..insert("b1", "store")
            },
            SyncBufferRowInsert {
                source_site_id: 1,
                sync_version: SyncVersion::V5V6,
                reference_id: Some("batch-x".to_string()),
                ..insert("c1", "store")
            },
        ])
        .unwrap();

        // reference_id: None matches IS NULL — c1 (batch-x) is excluded
        let rows = repo
            .pending_ordered_by_cursor(PendingQuery {
                source_site_id: 1,
                sync_version: SyncVersion::V5V6,
                reference_id: None,
                table_name: "store",
                action: SyncAction::Upsert,
                direction: CursorDirection::Asc,
                limit: i64::MAX,
            })
            .unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.record_id.as_str()).collect();
        assert_eq!(ids, vec!["a1", "a2"]);

        // Filter narrowed to the batch reference
        let rows = repo
            .pending_ordered_by_cursor(PendingQuery {
                source_site_id: 1,
                sync_version: SyncVersion::V5V6,
                reference_id: Some("batch-x"),
                table_name: "store",
                action: SyncAction::Upsert,
                direction: CursorDirection::Asc,
                limit: i64::MAX,
            })
            .unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.record_id.as_str()).collect();
        assert_eq!(ids, vec!["c1"]);

        // Reverse direction (deletes use Desc within table)
        let rows = repo
            .pending_ordered_by_cursor(PendingQuery {
                source_site_id: 1,
                sync_version: SyncVersion::V5V6,
                reference_id: None,
                table_name: "store",
                action: SyncAction::Upsert,
                direction: CursorDirection::Desc,
                limit: i64::MAX,
            })
            .unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.record_id.as_str()).collect();
        assert_eq!(ids, vec!["a2", "a1"]);

        // V7 partition is isolated
        let rows = repo
            .pending_ordered_by_cursor(PendingQuery {
                source_site_id: 2,
                sync_version: SyncVersion::V7,
                reference_id: None,
                table_name: "store",
                action: SyncAction::Upsert,
                direction: CursorDirection::Asc,
                limit: i64::MAX,
            })
            .unwrap();
        let ids: Vec<_> = rows.iter().map(|r| r.record_id.as_str()).collect();
        assert_eq!(ids, vec!["b1"]);
    }

    #[actix_rt::test]
    async fn test_sync_buffer_count_pending() {
        let (_, connection, _, _) =
            test_db::setup_all("test_sync_buffer_count_pending", MockDataInserts::none()).await;

        let repo = SyncBufferRepository::new(&connection);

        repo.insert_many(&[
            SyncBufferRowInsert {
                source_site_id: 1,
                ..insert("s1", "store")
            },
            SyncBufferRowInsert {
                source_site_id: 1,
                ..insert("n1", "name")
            },
            // Legacy table with no translator — never visited by integration
            SyncBufferRowInsert {
                source_site_id: 1,
                ..insert("p1", "pref")
            },
        ])
        .unwrap();

        // Unfiltered count includes the unsupported table
        assert_eq!(
            repo.count_pending(1, SyncVersion::V5V6, None, None)
                .unwrap(),
            3
        );

        // Filtered to the tables integration will visit, the unsupported row is excluded
        assert_eq!(
            repo.count_pending(1, SyncVersion::V5V6, None, Some(&["store", "name"]))
                .unwrap(),
            2
        );
    }

    #[actix_rt::test]
    async fn test_sync_buffer_set_integration_result() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_sync_buffer_set_integration_result",
            MockDataInserts::none(),
        )
        .await;

        let repo = SyncBufferRepository::new(&connection);

        repo.insert_many(&[
            SyncBufferRowInsert {
                source_site_id: 1,
                ..insert("r1", "store")
            },
            SyncBufferRowInsert {
                source_site_id: 1,
                ..insert("r2", "store")
            },
            SyncBufferRowInsert {
                source_site_id: 1,
                ..insert("r3", "store")
            },
        ])
        .unwrap();

        let rows = repo
            .pending_ordered_by_cursor(PendingQuery {
                source_site_id: 1,
                sync_version: SyncVersion::V5V6,
                reference_id: None,
                table_name: "store",
                action: SyncAction::Upsert,
                direction: CursorDirection::Asc,
                limit: i64::MAX,
            })
            .unwrap();
        assert_eq!(rows.len(), 3);

        let started = chrono::Utc::now().naive_utc();
        repo.set_integration_result(rows[0].cursor, started, IntegrationResult::Success, None)
            .unwrap();
        repo.set_integration_result(
            rows[1].cursor,
            started,
            IntegrationResult::Error,
            Some("oh no"),
        )
        .unwrap();
        repo.set_integration_result(
            rows[2].cursor,
            started,
            IntegrationResult::Ignored,
            Some("not for us"),
        )
        .unwrap();

        // After recording results, no rows are pending
        let pending = repo
            .pending_ordered_by_cursor(PendingQuery {
                source_site_id: 1,
                sync_version: SyncVersion::V5V6,
                reference_id: None,
                table_name: "store",
                action: SyncAction::Upsert,
                direction: CursorDirection::Asc,
                limit: i64::MAX,
            })
            .unwrap();
        assert!(pending.is_empty());

        let r1 = repo
            .find_latest_by_record_id_slow_unindexed("r1")
            .unwrap()
            .unwrap();
        assert_eq!(r1.integration_result, Some(IntegrationResult::Success));
        assert_eq!(r1.integration_error, None);
        assert!(r1.integration_started_datetime.is_some());
        assert!(r1.integration_datetime.is_some());

        let r2 = repo
            .find_latest_by_record_id_slow_unindexed("r2")
            .unwrap()
            .unwrap();
        assert_eq!(r2.integration_result, Some(IntegrationResult::Error));
        assert_eq!(r2.integration_error.as_deref(), Some("oh no"));

        let r3 = repo
            .find_latest_by_record_id_slow_unindexed("r3")
            .unwrap()
            .unwrap();
        assert_eq!(r3.integration_result, Some(IntegrationResult::Ignored));
        assert_eq!(r3.integration_error.as_deref(), Some("not for us"));
    }

    #[actix_rt::test]
    async fn test_sync_buffer_find_latest_by_record_id_unindexed_returns_most_recent() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_sync_buffer_find_latest_by_record_id_unindexed_returns_most_recent",
            MockDataInserts::none(),
        )
        .await;

        let repo = SyncBufferRepository::new(&connection);

        repo.insert_many(&[insert("dup", "store"), insert("dup", "store")])
            .unwrap();

        let pending = repo
            .pending_ordered_by_cursor(PendingQuery {
                source_site_id: 0,
                sync_version: SyncVersion::V5V6,
                reference_id: None,
                table_name: "store",
                action: SyncAction::Upsert,
                direction: CursorDirection::Asc,
                limit: i64::MAX,
            })
            .unwrap();
        assert_eq!(pending.len(), 2);

        let latest = repo
            .find_latest_by_record_id_slow_unindexed("dup")
            .unwrap()
            .unwrap();
        assert_eq!(latest.cursor, pending[1].cursor);
    }
}
