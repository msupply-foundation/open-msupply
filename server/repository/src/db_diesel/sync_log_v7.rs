use crate::{
    diesel_macros::apply_sort,
    dynamic_query_filter::create_condition,
    syncv7::SyncError,
    DBType, Pagination, RepositoryError, Sort, StorageConnection,
};

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

#[derive(Debug, PartialEq)]
pub enum SyncLogV7SortField {
    StartedDatetime,
}

pub struct SyncLogV7Repository<'a> {
    connection: &'a StorageConnection,
}

type Source = sync_log_v7::table;
type BoxedQuery = sync_log_v7::BoxedQuery<'static, DBType>;

create_condition!(
    SyncLogV7Condition,
    Source,
    (
        StartedDatetime,
        NaiveDateTime,
        sync_log_v7::started_datetime
    ),
    (
        FinishedDatetime,
        NaiveDateTime,
        sync_log_v7::finished_datetime
    ),
    (
        IntegrationFinishedDatetime,
        NaiveDateTime,
        sync_log_v7::integration_finished_datetime
    ),
    (Error, string, sync_log_v7::error),
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
        filter: SyncLogV7Condition::Inner,
    ) -> Result<Option<SyncLogV7Row>, RepositoryError> {
        Ok(self
            .query(
                Pagination::one(),
                filter,
                Some(Sort {
                    key: SyncLogV7SortField::StartedDatetime,
                    desc: Some(true),
                }),
            )?
            .pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: SyncLogV7Condition::Inner,
        sort: Option<Sort<SyncLogV7SortField>>,
    ) -> Result<Vec<SyncLogV7Row>, RepositoryError> {
        let mut query: BoxedQuery = sync_log_v7::table.filter(filter.to_boxed()).into_boxed();

        if let Some(sort) = sort {
            match sort.key {
                SyncLogV7SortField::StartedDatetime => {
                    apply_sort!(query, sort, sync_log_v7::started_datetime)
                }
            }
        } else {
            query = query.order(sync_log_v7::started_datetime.desc());
        }

        Ok(query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<SyncLogV7Row>(self.connection.lock().connection())?)
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

    fn row_incomplete() -> SyncLogV7Row {
        SyncLogV7Row {
            id: "sync_1".to_string(),
            ..Default::default()
        }
    }

    fn row_completed_with_error() -> SyncLogV7Row {
        SyncLogV7Row {
            id: "sync_2".to_string(),
            started_datetime: NaiveDateTime::default() + Duration::seconds(60),
            finished_datetime: Some(NaiveDateTime::default() + Duration::seconds(120)),
            error: Some(SyncError::Other("test error".to_string())),
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

        use super::SyncLogV7Condition as Condition;
        use crate::dynamic_query_filter::FilterBuilder;

        let is_initialised = || {
            Condition::And(vec![
                Condition::FinishedDatetime::is_not_null(),
                Condition::Error::is_null(),
            ])
        };

        // Empty table
        assert_eq!(repo.query_one(Condition::TRUE).unwrap(), None);
        assert_eq!(repo.query_one(is_initialised()).unwrap(), None);

        // Not initialised: only incomplete and completed-with-error rows
        repo.upsert_one(&row_incomplete()).unwrap();
        repo.upsert_one(&row_completed_with_error()).unwrap();
        assert_eq!(repo.query_one(is_initialised()).unwrap(), None);

        // Latest returns most recent by started_datetime
        assert_eq!(
            repo.query_one(Condition::TRUE).unwrap(),
            Some(row_completed_with_error())
        );

        // Upsert overwrites existing row
        let mut updated = row_completed_with_error();
        updated.error = None;
        repo.upsert_one(&updated).unwrap();
        assert_eq!(
            repo.query_one(Condition::TRUE).unwrap().unwrap().error,
            None
        );

        // Initialised once a completed row without error exists
        assert!(repo.query_one(is_initialised()).unwrap().is_some());
    }
}
