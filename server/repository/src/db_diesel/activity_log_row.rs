use super::{activity_log_row::activity_log::dsl as activity_log_dsl, StorageConnection};

use crate::{db_diesel::store_row::store, repository_error::RepositoryError, user_account};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    activity_log (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::activity_log_row::ActivityLogTypeMapping,
        user_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        record_id -> Nullable<Text>,
        datetime -> Timestamp,
        event -> Nullable<Text>,
    }
}

joinable!(activity_log -> user_account (user_id));
joinable!(activity_log -> store (store_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ActivityLogType {
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
    StockLocationChange,
    StockCostPriceChange,
    StockSellPriceChange,
    StockExpiryDateChange,
    StockBatchChange,
    StockOnHold,
    StockOffHold,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "activity_log"]
pub struct ActivityLogRow {
    pub id: String,
    #[column_name = "type_"]
    pub r#type: ActivityLogType,
    pub user_id: Option<String>,
    pub store_id: Option<String>,
    pub record_id: Option<String>,
    pub datetime: NaiveDateTime,
    pub event: Option<String>,
}

pub struct ActivityLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ActivityLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ActivityLogRowRepository { connection }
    }

    pub fn insert_one(&self, row: &ActivityLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(activity_log_dsl::activity_log)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, log_id: &str) -> Result<Option<ActivityLogRow>, RepositoryError> {
        let result = activity_log_dsl::activity_log
            .filter(activity_log_dsl::id.eq(log_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_record_id(&self, id: &str) -> Result<Vec<ActivityLogRow>, RepositoryError> {
        let result = activity_log_dsl::activity_log
            .filter(activity_log_dsl::record_id.eq(id))
            .get_results(&self.connection.connection)?;
        Ok(result)
    }
}
