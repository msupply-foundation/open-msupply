use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

use crate::RepositoryError;

use super::{sync_log::sync_log::dsl as sync_log_dsl, StorageConnection};

table! {
    sync_log(id) {
        id -> Text,
        #[sql_name="type"] type_ -> crate::db_diesel::sync_log::SyncLogTypeMapping,
        started_datetime -> Timestamp,
        completed_datetime -> Nullable<Timestamp>,
        error_datetime -> Nullable<Timestamp>,
        error_message -> Nullable<Text>,
        progress_total -> Nullable<BigInt>,
        progress_done -> Nullable<BigInt>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncLogType {
    Initialisation,
    Operational,
    PrepareInitialRecords,
    PullCentral,
    PushRemote,
    PullRemote,
}

// TODO
// #[derive(DbEnum, Debug, Clone, PartialEq)]
// #[DbValueStyle = "SCREAMING_SNAKE_CASE"]
// pub enum SyncLogErrorCode {
// }

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "sync_log"]
pub struct SyncLogRow {
    pub id: String,
    #[column_name = "type_"]
    pub r#type: SyncLogType,
    pub started_datetime: NaiveDateTime,
    pub completed_datetime: Option<NaiveDateTime>,
    pub error_datetime: Option<NaiveDateTime>,
    pub error_message: Option<String>,
    pub progress_total: Option<i64>,
    pub progress_done: Option<i64>,
}

pub struct SyncLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncLogRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &SyncLogRow) -> Result<(), ReopsitoryError> {
        let statement = diesel::insert_into(sync_log_dsl::sync_log)
            .value(row)
            .on_conflict(sync_log_dsl::id)
            .do_update()
            .set(row);

        statement.execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &SyncLogRow) -> Result<(), RepositoryError> {
        diesel::replace_into(sync_log_dsl::sync_log)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_latest_sync_log(&self) -> Result<SyncLogRow, RepositoryError> {
        let result = sync_log_dsl::sync_log
            .order(sync_log_dsl::started_datetime.desc())
            .first::<SyncLogRow>(&self.connection.connection)?;

        Ok(result)
    }

    pub fn find_one_by_id(&self, sync_log_id: &str) -> Result<Option<SyncLogRow>, RepositoryError> {
        let result = sync_log_dsl::sync_log
            .filter(sync_log_dsl::id.eq(sync_log_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
