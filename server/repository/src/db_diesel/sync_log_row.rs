use chrono::NaiveDateTime;
use diesel::prelude::*;
use util::Defaults;

use crate::RepositoryError;

use super::{sync_log_row::sync_log::dsl as sync_log_dsl, StorageConnection};

table! {
    sync_log(id) {
        id -> Text,
        started_datetime -> Timestamp,
        done_datetime -> Nullable<Timestamp>,
        prepare_initial_start_datetime -> Nullable<Timestamp>,
        prepare_initial_done_datetime -> Nullable<Timestamp>,
        push_start_datetime -> Nullable<Timestamp>,
        push_done_datetime -> Nullable<Timestamp>,
        push_progress_total -> Nullable<Integer>,
        push_progress_done -> Nullable<Integer>,
        pull_central_start_datetime -> Nullable<Timestamp>,
        pull_central_done_datetime -> Nullable<Timestamp>,
        pull_central_progress_total -> Nullable<Integer>,
        pull_central_progress_done -> Nullable<Integer>,
        pull_remote_start_datetime -> Nullable<Timestamp>,
        pull_remote_done_datetime -> Nullable<Timestamp>,
        pull_remote_progress_total -> Nullable<Integer>,
        pull_remote_progress_done -> Nullable<Integer>,
        integration_start_datetime -> Nullable<Timestamp>,
        integration_done_datetime -> Nullable<Timestamp>,
        error_message -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "sync_log"]
pub struct SyncLogRow {
    pub id: String,
    pub started_datetime: NaiveDateTime,
    pub done_datetime: Option<NaiveDateTime>,
    pub prepare_initial_start_datetime: Option<NaiveDateTime>,
    pub prepare_initial_done_datetime: Option<NaiveDateTime>,
    pub push_start_datetime: Option<NaiveDateTime>,
    pub push_done_datetime: Option<NaiveDateTime>,
    pub push_progress_total: Option<i32>,
    pub push_progress_done: Option<i32>,
    pub pull_central_start_datetime: Option<NaiveDateTime>,
    pub pull_central_done_datetime: Option<NaiveDateTime>,
    pub pull_central_progress_total: Option<i32>,
    pub pull_central_progress_done: Option<i32>,
    pub pull_remote_start_datetime: Option<NaiveDateTime>,
    pub pull_remote_done_datetime: Option<NaiveDateTime>,
    pub pull_remote_progress_total: Option<i32>,
    pub pull_remote_progress_done: Option<i32>,
    pub integration_start_datetime: Option<NaiveDateTime>,
    pub integration_done_datetime: Option<NaiveDateTime>,
    pub error_message: Option<String>,
}

impl Default for SyncLogRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            started_datetime: Defaults::naive_date_time(),
            done_datetime: Default::default(),
            prepare_initial_start_datetime: Default::default(),
            prepare_initial_done_datetime: Default::default(),
            push_start_datetime: Default::default(),
            push_done_datetime: Default::default(),
            push_progress_total: Default::default(),
            push_progress_done: Default::default(),
            pull_central_start_datetime: Default::default(),
            pull_central_done_datetime: Default::default(),
            pull_central_progress_total: Default::default(),
            pull_central_progress_done: Default::default(),
            pull_remote_start_datetime: Default::default(),
            pull_remote_done_datetime: Default::default(),
            pull_remote_progress_total: Default::default(),
            pull_remote_progress_done: Default::default(),
            integration_start_datetime: Default::default(),
            integration_done_datetime: Default::default(),
            error_message: Default::default(),
        }
    }
}

pub struct SyncLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncLogRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &SyncLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(sync_log_dsl::sync_log)
            .values(row)
            .on_conflict(sync_log_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &SyncLogRow) -> Result<(), RepositoryError> {
        diesel::replace_into(sync_log_dsl::sync_log)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
