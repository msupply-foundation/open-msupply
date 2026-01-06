use crate::{
    dynamic_query::create_condition, syncv7::SyncError, RepositoryError, StorageConnection,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;

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

#[derive(Clone, Queryable, Selectable, Insertable, AsChangeset, Debug, Default)]
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

type Source = sync_log_v7::table;

create_condition!(
    Source,
    (finished_datetime, string, sync_log_v7::finished_datetime),
    (error, string, sync_log_v7::error),
);

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

    pub fn query_one(
        &self,
        filter: Condition::Inner,
    ) -> Result<Option<SyncLogV7Row>, RepositoryError> {
        let results = sync_log_v7::table
            .filter(filter.to_boxed_condition())
            .first::<SyncLogV7Row>(self.connection.lock().connection())
            .optional()?;
        Ok(results)
    }
}
