use super::{
    clinician_link_row::clinician_link, currency_row::currency, item_link_row::item_link,
    name_row::name, store_row::store, user_row::user_account, StorageConnection,
};
use crate::{
    repository_error::RepositoryError, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    Delete, RowActionType, Upsert,
};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::{dsl::max, prelude::*};
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use std::any::Any;
use strum::Display;

// View table - used for SELECT queries (has resolved name_id)
table! {
    #[sql_name = "invoice_view"]
    invoice (id) {
        id -> Text,
        name_store_id -> Nullable<Text>,
        store_id -> Text,
        user_id -> Nullable<Text>,
        invoice_number -> BigInt,
        #[sql_name = "type"] type_ -> crate::db_diesel::invoice_row::InvoiceTypeMapping,
        status -> crate::db_diesel::invoice_row::InvoiceStatusMapping,
        on_hold -> Bool,
        comment -> Nullable<Text>,
        their_reference -> Nullable<Text>,
        transport_reference -> Nullable<Text>,
        created_datetime -> Timestamp,
        allocated_datetime -> Nullable<Timestamp>,
        picked_datetime -> Nullable<Timestamp>,
        shipped_datetime -> Nullable<Timestamp>,
        delivered_datetime -> Nullable<Timestamp>,
        received_datetime -> Nullable<Timestamp>,
        verified_datetime -> Nullable<Timestamp>,
        cancelled_datetime -> Nullable<Timestamp>,
        colour -> Nullable<Text>,
        requisition_id -> Nullable<Text>,
        linked_invoice_id -> Nullable<Text>,
        tax_percentage -> Nullable<Double>,
        currency_id -> Nullable<Text>,
        currency_rate -> Double,
        clinician_link_id -> Nullable<Text>,
        original_shipment_id -> Nullable<Text>,
        backdated_datetime -> Nullable<Timestamp>,
        diagnosis_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
        name_insurance_join_id -> Nullable<Text>,
        insurance_discount_amount -> Nullable<Double>,
        insurance_discount_percentage -> Nullable<Double>,
        is_cancellation -> Bool,
        expected_delivery_date -> Nullable<Date>,
        default_donor_link_id -> Nullable<Text>,
        goods_received_id -> Nullable<Text>,
        // Resolved from name_link join in the view
        name_id -> Text,
    }
}

// Core table - used for INSERT/UPDATE (has name_link_id)
table! {
    #[sql_name = "invoice"]
    invoice_with_links (id) {
        id -> Text,
        name_link_id -> Text,
        name_store_id -> Nullable<Text>,
        store_id -> Text,
        user_id -> Nullable<Text>,
        invoice_number -> BigInt,
        #[sql_name = "type"] type_ -> crate::db_diesel::invoice_row::InvoiceTypeMapping,
        status -> crate::db_diesel::invoice_row::InvoiceStatusMapping,
        on_hold -> Bool,
        comment -> Nullable<Text>,
        their_reference -> Nullable<Text>,
        transport_reference -> Nullable<Text>,
        created_datetime -> Timestamp,
        allocated_datetime -> Nullable<Timestamp>,
        picked_datetime -> Nullable<Timestamp>,
        shipped_datetime -> Nullable<Timestamp>,
        delivered_datetime -> Nullable<Timestamp>,
        received_datetime -> Nullable<Timestamp>,
        verified_datetime -> Nullable<Timestamp>,
        cancelled_datetime -> Nullable<Timestamp>,
        colour -> Nullable<Text>,
        requisition_id -> Nullable<Text>,
        linked_invoice_id -> Nullable<Text>,
        tax_percentage -> Nullable<Double>,
        currency_id -> Nullable<Text>,
        currency_rate -> Double,
        clinician_link_id -> Nullable<Text>,
        original_shipment_id -> Nullable<Text>,
        backdated_datetime -> Nullable<Timestamp>,
        diagnosis_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
        name_insurance_join_id -> Nullable<Text>,
        insurance_discount_amount -> Nullable<Double>,
        insurance_discount_percentage -> Nullable<Double>,
        is_cancellation -> Bool,
        expected_delivery_date -> Nullable<Date>,
        default_donor_link_id -> Nullable<Text>,
        goods_received_id -> Nullable<Text>,
    }
}

joinable!(invoice -> name (name_id));
joinable!(invoice -> store (store_id));
joinable!(invoice -> user_account (user_id));
joinable!(invoice -> currency (currency_id));
joinable!(invoice -> clinician_link (clinician_link_id));
allow_tables_to_appear_in_same_query!(invoice, item_link);

#[derive(
    DbEnum, Debug, Display, Clone, PartialEq, Eq, Serialize, Deserialize, Default, PartialOrd, Ord,
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceType {
    OutboundShipment,
    #[default]
    InboundShipment,
    Prescription,
    // Initially we had single inventory adjustment InvoiceType, this was changed to two separate types
    // central server may have old inventory adjustment type, thus map it to inventory additions
    #[serde(alias = "INVENTORY_ADJUSTMENT")]
    InventoryAddition,
    InventoryReduction,
    Repack,
    #[serde(alias = "OUTBOUND_RETURN")]
    SupplierReturn,
    #[serde(alias = "INBOUND_RETURN")]
    CustomerReturn,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceStatus {
    #[default]
    New,
    Allocated,
    Picked,
    Shipped,
    Received,
    Delivered,
    Verified,
    Cancelled,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = invoice)]
pub struct InvoiceRow {
    pub id: String,
    pub name_store_id: Option<String>,
    pub store_id: String,
    pub user_id: Option<String>,
    pub invoice_number: i64,
    #[diesel(column_name = type_)]
    pub r#type: InvoiceType,
    pub status: InvoiceStatus,
    pub on_hold: bool,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub transport_reference: Option<String>,
    pub created_datetime: NaiveDateTime,
    pub allocated_datetime: Option<NaiveDateTime>,
    pub picked_datetime: Option<NaiveDateTime>,
    pub shipped_datetime: Option<NaiveDateTime>,
    pub delivered_datetime: Option<NaiveDateTime>,
    pub received_datetime: Option<NaiveDateTime>,
    pub verified_datetime: Option<NaiveDateTime>,
    pub cancelled_datetime: Option<NaiveDateTime>,
    pub colour: Option<String>,
    pub requisition_id: Option<String>,
    pub linked_invoice_id: Option<String>,
    pub tax_percentage: Option<f64>,
    pub currency_id: Option<String>,
    pub currency_rate: f64,
    pub clinician_link_id: Option<String>,
    pub original_shipment_id: Option<String>,
    pub backdated_datetime: Option<NaiveDateTime>,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub name_insurance_join_id: Option<String>,
    pub insurance_discount_amount: Option<f64>,
    pub insurance_discount_percentage: Option<f64>,
    pub is_cancellation: bool,
    pub expected_delivery_date: Option<NaiveDate>,
    pub default_donor_link_id: Option<String>,
    pub goods_received_id: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub name_id: String,
}

pub struct InvoiceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &InvoiceRow) -> Result<i64, RepositoryError> {
        // Write to core table (invoice_with_links) which has name_link_id column
        diesel::insert_into(invoice_with_links::table)
            .values((
                invoice_with_links::id.eq(&row.id),
                invoice_with_links::name_link_id.eq(&row.name_id),
                invoice_with_links::name_store_id.eq(&row.name_store_id),
                invoice_with_links::store_id.eq(&row.store_id),
                invoice_with_links::user_id.eq(&row.user_id),
                invoice_with_links::invoice_number.eq(&row.invoice_number),
                invoice_with_links::type_.eq(&row.r#type),
                invoice_with_links::status.eq(&row.status),
                invoice_with_links::on_hold.eq(&row.on_hold),
                invoice_with_links::comment.eq(&row.comment),
                invoice_with_links::their_reference.eq(&row.their_reference),
                invoice_with_links::transport_reference.eq(&row.transport_reference),
                invoice_with_links::created_datetime.eq(&row.created_datetime),
                invoice_with_links::allocated_datetime.eq(&row.allocated_datetime),
                invoice_with_links::picked_datetime.eq(&row.picked_datetime),
                invoice_with_links::shipped_datetime.eq(&row.shipped_datetime),
                invoice_with_links::delivered_datetime.eq(&row.delivered_datetime),
                invoice_with_links::received_datetime.eq(&row.received_datetime),
                invoice_with_links::verified_datetime.eq(&row.verified_datetime),
                invoice_with_links::cancelled_datetime.eq(&row.cancelled_datetime),
                invoice_with_links::colour.eq(&row.colour),
                invoice_with_links::requisition_id.eq(&row.requisition_id),
                invoice_with_links::linked_invoice_id.eq(&row.linked_invoice_id),
                invoice_with_links::tax_percentage.eq(&row.tax_percentage),
                invoice_with_links::currency_id.eq(&row.currency_id),
                invoice_with_links::currency_rate.eq(&row.currency_rate),
                invoice_with_links::clinician_link_id.eq(&row.clinician_link_id),
                invoice_with_links::original_shipment_id.eq(&row.original_shipment_id),
                invoice_with_links::backdated_datetime.eq(&row.backdated_datetime),
                invoice_with_links::diagnosis_id.eq(&row.diagnosis_id),
                invoice_with_links::program_id.eq(&row.program_id),
                invoice_with_links::name_insurance_join_id.eq(&row.name_insurance_join_id),
                invoice_with_links::insurance_discount_amount.eq(&row.insurance_discount_amount),
                invoice_with_links::insurance_discount_percentage
                    .eq(&row.insurance_discount_percentage),
                invoice_with_links::is_cancellation.eq(&row.is_cancellation),
                invoice_with_links::expected_delivery_date.eq(&row.expected_delivery_date),
                invoice_with_links::default_donor_link_id.eq(&row.default_donor_link_id),
                invoice_with_links::goods_received_id.eq(&row.goods_received_id),
            ))
            .on_conflict(invoice_with_links::id)
            .do_update()
            .set((
                invoice_with_links::name_link_id.eq(&row.name_id),
                invoice_with_links::name_store_id.eq(&row.name_store_id),
                invoice_with_links::store_id.eq(&row.store_id),
                invoice_with_links::user_id.eq(&row.user_id),
                invoice_with_links::invoice_number.eq(&row.invoice_number),
                invoice_with_links::type_.eq(&row.r#type),
                invoice_with_links::status.eq(&row.status),
                invoice_with_links::on_hold.eq(&row.on_hold),
                invoice_with_links::comment.eq(&row.comment),
                invoice_with_links::their_reference.eq(&row.their_reference),
                invoice_with_links::transport_reference.eq(&row.transport_reference),
                invoice_with_links::created_datetime.eq(&row.created_datetime),
                invoice_with_links::allocated_datetime.eq(&row.allocated_datetime),
                invoice_with_links::picked_datetime.eq(&row.picked_datetime),
                invoice_with_links::shipped_datetime.eq(&row.shipped_datetime),
                invoice_with_links::delivered_datetime.eq(&row.delivered_datetime),
                invoice_with_links::received_datetime.eq(&row.received_datetime),
                invoice_with_links::verified_datetime.eq(&row.verified_datetime),
                invoice_with_links::cancelled_datetime.eq(&row.cancelled_datetime),
                invoice_with_links::colour.eq(&row.colour),
                invoice_with_links::requisition_id.eq(&row.requisition_id),
                invoice_with_links::linked_invoice_id.eq(&row.linked_invoice_id),
                invoice_with_links::tax_percentage.eq(&row.tax_percentage),
                invoice_with_links::currency_id.eq(&row.currency_id),
                invoice_with_links::currency_rate.eq(&row.currency_rate),
                invoice_with_links::clinician_link_id.eq(&row.clinician_link_id),
                invoice_with_links::original_shipment_id.eq(&row.original_shipment_id),
                invoice_with_links::backdated_datetime.eq(&row.backdated_datetime),
                invoice_with_links::diagnosis_id.eq(&row.diagnosis_id),
                invoice_with_links::program_id.eq(&row.program_id),
                invoice_with_links::name_insurance_join_id.eq(&row.name_insurance_join_id),
                invoice_with_links::insurance_discount_amount.eq(&row.insurance_discount_amount),
                invoice_with_links::insurance_discount_percentage
                    .eq(&row.insurance_discount_percentage),
                invoice_with_links::is_cancellation.eq(&row.is_cancellation),
                invoice_with_links::expected_delivery_date.eq(&row.expected_delivery_date),
                invoice_with_links::default_donor_link_id.eq(&row.default_donor_link_id),
                invoice_with_links::goods_received_id.eq(&row.goods_received_id),
            ))
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &InvoiceRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Invoice,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: Some(row.name_id.clone()),
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, invoice_id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(invoice_id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(&old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };

        diesel::delete(invoice_with_links::table.filter(invoice_with_links::id.eq(invoice_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, invoice_id: &str) -> Result<Option<InvoiceRow>, RepositoryError> {
        let result = invoice::table
            .filter(invoice::id.eq(invoice_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<InvoiceRow>, RepositoryError> {
        let result = invoice::table
            .filter(invoice::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_max_invoice_number(
        &self,
        r#type: InvoiceType,
        store: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = invoice::table
            .filter(invoice::type_.eq(r#type).and(invoice::store_id.eq(store)))
            .select(max(invoice::invoice_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct InvoiceRowDelete(pub String);
impl Delete for InvoiceRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = InvoiceRowRepository::new(con).delete(&self.0)?;
        Ok(change_log_id)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            InvoiceRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for InvoiceRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = InvoiceRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            InvoiceRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }

    fn as_mut_any(&mut self) -> Option<&mut dyn Any> {
        Some(self)
    }
}
