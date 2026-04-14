use crate::{syncv7::SyncError, RepositoryError, StorageConnection};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

table! {
    sync_log_v7(id) {
        id -> Text,
        started_datetime -> Timestamp,
        finished_datetime -> Nullable<Timestamp>,
        push_started_datetime -> Nullable<Timestamp>,
        push_finished_datetime -> Nullable<Timestamp>,
        push_progress_total -> Nullable<Integer>,
        push_progress_done -> Nullable<Integer>,
        wait_for_integration_started_datetime -> Nullable<Timestamp>,
        wait_for_integration_finished_datetime -> Nullable<Timestamp>,
        pull_started_datetime -> Nullable<Timestamp>,
        pull_finished_datetime -> Nullable<Timestamp>,
        pull_progress_total -> Nullable<Integer>,
        pull_progress_done -> Nullable<Integer>,
        integration_started_datetime -> Nullable<Timestamp>,
        integration_finished_datetime -> Nullable<Timestamp>,
        integration_progress_total -> Nullable<Integer>,
        integration_progress_done -> Nullable<Integer>,
        error -> Nullable<Text>,
    }
}

#[derive(
    Clone,
    Queryable,
    Selectable,
    Insertable,
    Deserialize,
    Serialize,
    AsChangeset,
    Debug,
    Default,
    PartialEq,
    TS,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = sync_log_v7)]
pub struct SyncLogV7Row {
    pub id: String,
    pub started_datetime: NaiveDateTime,
    pub finished_datetime: Option<NaiveDateTime>,
    pub push_started_datetime: Option<NaiveDateTime>,
    pub push_finished_datetime: Option<NaiveDateTime>,
    pub push_progress_total: Option<i32>,
    pub push_progress_done: Option<i32>,
    pub wait_for_integration_started_datetime: Option<NaiveDateTime>,
    pub wait_for_integration_finished_datetime: Option<NaiveDateTime>,
    pub pull_started_datetime: Option<NaiveDateTime>,
    pub pull_finished_datetime: Option<NaiveDateTime>,
    pub pull_progress_total: Option<i32>,
    pub pull_progress_done: Option<i32>,
    pub integration_started_datetime: Option<NaiveDateTime>,
    pub integration_finished_datetime: Option<NaiveDateTime>,
    pub integration_progress_total: Option<i32>,
    pub integration_progress_done: Option<i32>,
    pub error: Option<SyncError>,
}

pub struct SyncLogV7Repository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncLogV7Repository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        Self { connection }
    }

    pub fn upsert_one(&self, row: &SyncLogV7Row) -> Result<(), RepositoryError> {
        diesel::insert_into(sync_log_v7::table)
            .values(row)
            .on_conflict(sync_log_v7::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    // Sorts by started_datetime descending
    // TODO: replace with query_one and the dynamic query from prototype
    pub fn latest(&self) -> Result<Option<SyncLogV7Row>, RepositoryError> {
        let result = sync_log_v7::table
            .order(sync_log_v7::started_datetime.desc())
            .first::<SyncLogV7Row>(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn is_initialised(&self) -> Result<bool, RepositoryError> {
        let result = sync_log_v7::table
            .filter(sync_log_v7::finished_datetime.is_not_null())
            .filter(sync_log_v7::error.is_null())
            .first::<SyncLogV7Row>(self.connection.lock().connection())
            .optional()?;
        Ok(result.is_some())
    }

    pub fn latest_successful(&self) -> Result<Option<SyncLogV7Row>, RepositoryError> {
        let result = sync_log_v7::table
            .filter(sync_log_v7::finished_datetime.is_not_null())
            .filter(sync_log_v7::error.is_null())
            .order(sync_log_v7::started_datetime.desc())
            .first::<SyncLogV7Row>(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::{MockData, MockDataInserts},
        syncv7::SyncError,
        test_db, SyncLogV7Repository, SyncLogV7Row,
    };

    use chrono::{Duration, NaiveDateTime};

    pub fn row_incomplete() -> SyncLogV7Row {
        SyncLogV7Row {
            id: "sync_1".to_string(),
            ..Default::default()
        }
    }

    pub fn row_completed_with_error() -> SyncLogV7Row {
        SyncLogV7Row {
            id: "sync_2".to_string(),
            started_datetime: NaiveDateTime::default() + Duration::seconds(60),
            finished_datetime: Some(NaiveDateTime::default() + Duration::seconds(120)),
            error: Some(SyncError::Other("test error".to_string())),
            ..Default::default()
        }
    }

    pub fn row_completed_ok() -> SyncLogV7Row {
        SyncLogV7Row {
            id: "sync_3".to_string(),
            started_datetime: NaiveDateTime::default() + Duration::seconds(180),
            finished_datetime: Some(NaiveDateTime::default() + Duration::seconds(240)),
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn test_sync_log_v7() {
        let (_, connection, _, _) = test_db::setup_all_with_data(
            "test_sync_log_v7",
            MockDataInserts::none(),
            MockData::default(),
        )
        .await;

        let repo = SyncLogV7Repository::new(&connection);

        // Empty table
        assert_eq!(repo.latest().unwrap(), None);
        assert_eq!(repo.is_initialised().unwrap(), false);

        // Not initialised: only incomplete and completed-with-error rows
        repo.upsert_one(&row_incomplete()).unwrap();
        repo.upsert_one(&row_completed_with_error()).unwrap();
        assert_eq!(repo.is_initialised().unwrap(), false);

        // Latest returns most recent by started_datetime
        assert_eq!(repo.latest().unwrap(), Some(row_completed_with_error()));

        // Initialised once a completed row without error exists
        repo.upsert_one(&row_completed_ok()).unwrap();
        assert_eq!(repo.is_initialised().unwrap(), true);

        // Upsert overwrites existing row
        let mut updated = row_completed_with_error();
        updated.error = None;
        repo.upsert_one(&updated).unwrap();
        assert_eq!(repo.latest().unwrap().unwrap().error, None);
    }
}
