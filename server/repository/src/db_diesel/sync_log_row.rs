use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use util::Defaults;

use crate::RepositoryError;

use super::{sync_log_row::sync_log::dsl as sync_log_dsl, StorageConnection};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncLogRowErrorCode {
    ConnectionError,
    SiteNameNotFound,
    IncorrectPassword,
    HardwareIdMismatch,
    SiteHasNoStore,
    SiteAuthTimeout,
    IntegrationTimeoutReached,
    IntegrationError,
    ApiVersionIncompatible,
    CentralV6NotConfigured,
}

table! {
    sync_log(id) {
        id -> Text,
        started_datetime -> Timestamp,
        finished_datetime -> Nullable<Timestamp>,
        prepare_initial_started_datetime -> Nullable<Timestamp>,
        prepare_initial_finished_datetime -> Nullable<Timestamp>,
        push_started_datetime -> Nullable<Timestamp>,
        push_finished_datetime -> Nullable<Timestamp>,
        push_progress_total -> Nullable<Integer>,
        push_progress_done -> Nullable<Integer>,
        pull_central_started_datetime -> Nullable<Timestamp>,
        pull_central_finished_datetime -> Nullable<Timestamp>,
        pull_central_progress_total -> Nullable<Integer>,
        pull_central_progress_done -> Nullable<Integer>,
        pull_remote_started_datetime -> Nullable<Timestamp>,
        pull_remote_finished_datetime -> Nullable<Timestamp>,
        pull_remote_progress_total -> Nullable<Integer>,
        pull_remote_progress_done -> Nullable<Integer>,
        pull_v6_started_datetime -> Nullable<Timestamp>,
        pull_v6_finished_datetime -> Nullable<Timestamp>,
        pull_v6_progress_total -> Nullable<Integer>,
        pull_v6_progress_done -> Nullable<Integer>,
        push_v6_started_datetime -> Nullable<Timestamp>,
        push_v6_finished_datetime -> Nullable<Timestamp>,
        push_v6_progress_total -> Nullable<Integer>,
        push_v6_progress_done -> Nullable<Integer>,
        integration_started_datetime -> Nullable<Timestamp>,
        integration_finished_datetime -> Nullable<Timestamp>,
        integration_progress_total -> Nullable<Integer>,
        integration_progress_done -> Nullable<Integer>,
        error_message -> Nullable<Text>,
        error_code -> Nullable<crate::db_diesel::sync_log_row::SyncLogRowErrorCodeMapping>,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "sync_log"]
pub struct SyncLogRow {
    pub id: String,
    pub started_datetime: NaiveDateTime,
    pub finished_datetime: Option<NaiveDateTime>,
    pub prepare_initial_started_datetime: Option<NaiveDateTime>,
    pub prepare_initial_finished_datetime: Option<NaiveDateTime>,
    pub push_started_datetime: Option<NaiveDateTime>,
    pub push_finished_datetime: Option<NaiveDateTime>,
    pub push_progress_total: Option<i32>,
    pub push_progress_done: Option<i32>,
    pub pull_central_started_datetime: Option<NaiveDateTime>,
    pub pull_central_finished_datetime: Option<NaiveDateTime>,
    pub pull_central_progress_total: Option<i32>,
    pub pull_central_progress_done: Option<i32>,
    pub pull_remote_started_datetime: Option<NaiveDateTime>,
    pub pull_remote_finished_datetime: Option<NaiveDateTime>,
    pub pull_remote_progress_total: Option<i32>,
    pub pull_remote_progress_done: Option<i32>,
    pub pull_v6_started_datetime: Option<NaiveDateTime>,
    pub pull_v6_finished_datetime: Option<NaiveDateTime>,
    pub pull_v6_progress_total: Option<i32>,
    pub pull_v6_progress_done: Option<i32>,
    pub push_v6_started_datetime: Option<NaiveDateTime>,
    pub push_v6_finished_datetime: Option<NaiveDateTime>,
    pub push_v6_progress_total: Option<i32>,
    pub push_v6_progress_done: Option<i32>,
    pub integration_started_datetime: Option<NaiveDateTime>,
    pub integration_finished_datetime: Option<NaiveDateTime>,
    pub integration_progress_total: Option<i32>,
    pub integration_progress_done: Option<i32>,
    pub error_message: Option<String>,
    pub error_code: Option<SyncLogRowErrorCode>,
}

impl Default for SyncLogRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            started_datetime: Defaults::naive_date_time(),
            finished_datetime: Default::default(),
            prepare_initial_started_datetime: Default::default(),
            prepare_initial_finished_datetime: Default::default(),
            push_started_datetime: Default::default(),
            push_finished_datetime: Default::default(),
            push_progress_total: Default::default(),
            push_progress_done: Default::default(),
            pull_central_started_datetime: Default::default(),
            pull_central_finished_datetime: Default::default(),
            pull_central_progress_total: Default::default(),
            pull_central_progress_done: Default::default(),
            pull_remote_started_datetime: Default::default(),
            pull_remote_finished_datetime: Default::default(),
            pull_remote_progress_total: Default::default(),
            pull_remote_progress_done: Default::default(),
            integration_started_datetime: Default::default(),
            integration_finished_datetime: Default::default(),
            integration_progress_done: Default::default(),
            integration_progress_total: Default::default(),
            error_message: Default::default(),
            error_code: Default::default(),
            pull_v6_started_datetime: Default::default(),
            pull_v6_finished_datetime: Default::default(),
            pull_v6_progress_total: Default::default(),
            pull_v6_progress_done: Default::default(),
            push_v6_started_datetime: Default::default(),
            push_v6_finished_datetime: Default::default(),
            push_v6_progress_total: Default::default(),
            push_v6_progress_done: Default::default(),
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

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<SyncLogRow>, RepositoryError> {
        let result = sync_log_dsl::sync_log
            .filter(sync_log_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

#[cfg(test)]
mod test {
    use strum::IntoEnumIterator;
    use util::inline_init;

    use crate::{
        mock::MockDataInserts, test_db::setup_all, SyncLogRow, SyncLogRowErrorCode,
        SyncLogRowRepository,
    };

    #[actix_rt::test]
    async fn sync_log_row_enum() {
        let (_, connection, _, _) = setup_all("sync_log_row_enum", MockDataInserts::none()).await;

        let repo = SyncLogRowRepository::new(&connection);
        // Try upsert all variants of SyncLogRowErrorCode, confirm that diesel enums match postgres
        for variant in SyncLogRowErrorCode::iter() {
            let result = repo.upsert_one(&inline_init(|r: &mut SyncLogRow| {
                r.id = "test".to_string();
                r.error_code = Some(variant.clone());
            }));
            assert_eq!(result, Ok(()));

            let result = repo.find_one_by_id("test").unwrap().unwrap();
            assert_eq!(result.error_code, Some(variant));
        }
    }
}
