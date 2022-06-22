use super::{log_row::log::dsl as log_dsl, StorageConnection};

use crate::{db_diesel::invoice_row::invoice, repository_error::RepositoryError, user_account};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

table! {
    log (id) {
        id -> Text,
        log_type -> crate::db_diesel::log_row::LogTypeMapping,
        user_id -> Text,
        record_id -> Nullable<Text>,
        created_datetime -> Timestamp,
    }
}

joinable!(log -> user_account (user_id));
joinable!(log -> invoice (record_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum LogType {
    UserLoggedIn,
    InvoiceCreated,
    InvoiceStatusShipped,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "log"]
pub struct LogRow {
    pub id: String,
    pub log_type: LogType,
    pub user_id: String,
    pub record_id: Option<String>,
    pub created_datetime: NaiveDateTime,
}

pub struct LogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LogRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &LogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(log_dsl::log)
            .values(row)
            .on_conflict(log_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<LogRow>, RepositoryError> {
        match log_dsl::log
            .filter(log_dsl::id.eq(id))
            .first(&self.connection.connection)
        {
            Ok(row) => Ok(Some(row)),
            Err(diesel::result::Error::NotFound) => Ok(None),
            Err(error) => Err(RepositoryError::from(error)),
        }
    }
}
