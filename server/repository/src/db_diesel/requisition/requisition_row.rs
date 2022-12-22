use super::requisition_row::requisition::dsl as requisition_dsl;

use crate::db_diesel::{name_row::name, store_row::store, user_row::user_account};
use crate::repository_error::RepositoryError;
use crate::StorageConnection;

use diesel::dsl::max;
use diesel::prelude::*;

use chrono::{NaiveDate, NaiveDateTime};
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use util::Defaults;

table! {
    requisition (id) {
        id -> Text,
        requisition_number -> Bigint,
        name_id -> Text,
        store_id -> Text,
        user_id -> Nullable<Text>,
        #[sql_name = "type"] type_ -> crate::db_diesel::requisition::requisition_row::RequisitionRowTypeMapping,
        #[sql_name = "status"] status -> crate::db_diesel::requisition::requisition_row::RequisitionRowStatusMapping,
        created_datetime -> Timestamp,
        sent_datetime -> Nullable<Timestamp>,
        finalised_datetime -> Nullable<Timestamp>,
        expected_delivery_date -> Nullable<Date>,
        colour -> Nullable<Text>,
        comment -> Nullable<Text>,
        their_reference -> Nullable<Text>,
        max_months_of_stock -> Double,
        min_months_of_stock -> Double,
        linked_requisition_id -> Nullable<Text>,
    }
}

joinable!(requisition -> name (name_id));
joinable!(requisition -> store (store_id));
joinable!(requisition -> user_account (user_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RequisitionRowType {
    Request,
    Response,
}
#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RequisitionRowStatus {
    Draft,
    New,
    Sent,
    Finalised,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "requisition"]
pub struct RequisitionRow {
    pub id: String,
    pub requisition_number: i64,
    pub name_id: String,
    pub store_id: String,
    pub user_id: Option<String>,
    #[column_name = "type_"]
    pub r#type: RequisitionRowType,
    pub status: RequisitionRowStatus,
    pub created_datetime: NaiveDateTime,
    pub sent_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub colour: Option<String>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub max_months_of_stock: f64,
    pub min_months_of_stock: f64,
    pub linked_requisition_id: Option<String>,
}

impl Default for RequisitionRow {
    fn default() -> Self {
        Self {
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Draft,
            created_datetime: Defaults::naive_date_time(),
            // Defaults
            id: Default::default(),
            user_id: Default::default(),
            requisition_number: Default::default(),
            name_id: Default::default(),
            store_id: Default::default(),
            sent_datetime: Default::default(),
            finalised_datetime: Default::default(),
            expected_delivery_date: Default::default(),
            colour: Default::default(),
            comment: Default::default(),
            their_reference: Default::default(),
            max_months_of_stock: Default::default(),
            min_months_of_stock: Default::default(),
            linked_requisition_id: Default::default(),
        }
    }
}

pub struct RequisitionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &RequisitionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(requisition_dsl::requisition)
            .values(row)
            .on_conflict(requisition_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &RequisitionRow) -> Result<(), RepositoryError> {
        diesel::replace_into(requisition_dsl::requisition)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, requisition_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(requisition_dsl::requisition.filter(requisition_dsl::id.eq(requisition_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionRow>, RepositoryError> {
        let result = requisition_dsl::requisition
            .filter(requisition_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_max_requisition_number(
        &self,
        r#type: RequisitionRowType,
        store_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = requisition_dsl::requisition
            .filter(
                requisition_dsl::type_
                    .eq(r#type)
                    .and(requisition_dsl::store_id.eq(store_id)),
            )
            .select(max(requisition_dsl::requisition_number))
            .first(&self.connection.connection)?;
        Ok(result)
    }
}
