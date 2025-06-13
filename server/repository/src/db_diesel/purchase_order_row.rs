use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection,
};

use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    purchase_order (id) {
                    id ->  Text,
                    store_id -> Text,
                    user_id -> Text,
                    supplier_name_link_id ->  Nullable<Text>,
                    purchase_order_number -> Integer,
                    status -> crate::db_diesel::purchase_order_row::PurchaseOrderStatusMapping,
                    created_datetime -> Timestamp,
                    confirmed_datetime ->  Nullable<Timestamp>,
                    delivery_datetime ->  Nullable<Timestamp>,
                    target_months->  Nullable<Double>,
                    comment->  Nullable<Text>,
                    supplier_discount_percentage ->  Nullable<Double>,
                    supplier_discount_amount -> Nullable<Double>,
                    donor_link_id -> Nullable<Text>,
                    reference -> Text,
                    currency_id -> Nullable<Text>,
                    foreign_exchange_rate -> Nullable<Double>,
                    shipping_method->  Nullable<Text>,
                    sent_datetime -> Nullable<Timestamp>,
                    contract_signed_datetime -> Nullable<Timestamp>,
                    advance_paid_datetime ->  Nullable<Timestamp>,
                    received_at_port_datetime ->   Nullable<Date>,
                    expected_delivery_datetime -> Nullable<Date>,
                    supplier_agent ->  Nullable<Text>,
                    authorising_officer_1 ->  Nullable<Text>,
                    authorising_officer_2 -> Nullable<Text>,
                    additional_instructions -> Nullable<Text>,
                    heading_message ->  Nullable<Text>,
                    agent_commission -> Nullable<Double>,
                    document_charge -> Nullable<Double>,
                    communications_charge -> Nullable<Double>,
                    insurance_charge ->  Nullable<Double>,
                    freight_charge ->  Nullable<Double>,
                    freight_conditions -> Nullable<Text>
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, AsChangeset, Serialize, Deserialize, Default, PartialEq,
)]
#[diesel(table_name = purchase_order)]
#[diesel(treat_none_as_null = true)]
pub struct PurchaseOrderRow {
    pub id: String,
    pub store_id: String,
    pub user_id: String,
    pub supplier_name_link_id: Option<String>,
    pub purchase_order_number: i32,
    pub status: PurchaseOrderStatus,
    pub created_datetime: NaiveDateTime,
    pub confirmed_datetime: Option<NaiveDateTime>,
    pub delivery_datetime: Option<NaiveDateTime>,
    pub target_months: Option<f64>,
    pub comment: Option<String>,
    pub supplier_discount_percentage: Option<f64>,
    pub supplier_discount_amount: Option<f64>,
    pub donor_link_id: Option<String>,
    pub reference: String,
    pub currency_id: Option<String>,
    pub foreign_exchange_rate: Option<f64>,
    pub shipping_method: Option<String>,
    pub sent_datetime: Option<NaiveDateTime>,
    pub contract_signed_datetime: Option<NaiveDateTime>,
    pub advance_paid_datetime: Option<NaiveDateTime>,
    pub received_at_port_datetime: Option<NaiveDate>,
    pub expected_delivery_datetime: Option<NaiveDate>,
    pub supplier_agent: Option<String>,
    pub authorising_officer_1: Option<String>,
    pub authorising_officer_2: Option<String>,
    pub additional_instructions: Option<String>,
    pub heading_message: Option<String>,
    pub agent_commission: Option<f64>,
    pub document_charge: Option<f64>,
    pub communications_charge: Option<f64>,
    pub insurance_charge: Option<f64>,
    pub freight_charge: Option<f64>,
    pub freight_conditions: Option<String>,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum PurchaseOrderStatus {
    #[default]
    New,
    Confirmed,
    Authorised,
    Finalised,
}

pub struct PurchaseOrderRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PurchaseOrderRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PurchaseOrderRowRepository { connection }
    }

    pub fn _upsert_one(
        &self,
        purchase_order_row: &PurchaseOrderRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(purchase_order::table)
            .values(purchase_order_row)
            .on_conflict(purchase_order::id)
            .do_update()
            .set(purchase_order_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        purchase_order_row: &PurchaseOrderRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(purchase_order_row)?;
        self.insert_changelog(purchase_order_row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: PurchaseOrderRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PurchaseOrder,
            record_id: row.id,
            row_action: action,
            store_id: Some(row.store_id),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<PurchaseOrderRow>, RepositoryError> {
        let result = purchase_order::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        purchase_order_id: &str,
    ) -> Result<Option<PurchaseOrderRow>, RepositoryError> {
        let result = purchase_order::table
            .filter(purchase_order::id.eq(purchase_order_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, purchase_order_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(purchase_order::table)
            .filter(purchase_order::id.eq(purchase_order_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
