use super::{log_row::log::dsl as log_dsl, StorageConnection};

use crate::{db_diesel::store_row::store, repository_error::RepositoryError, user_account};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

table! {
    log (id) {
        id -> Text,
        log_type -> crate::db_diesel::log_row::LogTypeMapping,
        user_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        record_id -> Nullable<Text>,
        datetime -> Timestamp,
    }
}

joinable!(log -> user_account (user_id));
joinable!(log -> store (store_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum LogType {
    UserLoggedIn,
    InvoiceCreated,
    InvoiceDeleted,
    InvoiceStatusAllocated,
    InvoiceStatusPicked,
    InvoiceStatusShipped,
    InvoiceStatusDelivered,
    InvoiceStatusVerified,
    StocktakeCreated,
    StocktakeDeleted,
    StocktakeStatusFinalised,
    RequisitionCreated,
    RequisitionDeleted,
    RequisitionStatusSent,
    RequisitionStatusFinalised,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "log"]
pub struct LogRow {
    pub id: String,
    pub log_type: LogType,
    pub user_id: Option<String>,
    pub store_id: Option<String>,
    pub record_id: Option<String>,
    pub datetime: NaiveDateTime,
}

pub struct LogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LogRowRepository { connection }
    }

    pub fn insert_one(&self, row: &LogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(log_dsl::log)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, log_id: &str) -> Result<Option<LogRow>, RepositoryError> {
        let result = log_dsl::log
            .filter(log_dsl::id.eq(log_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
