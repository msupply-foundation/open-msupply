use std::any::Any;

use super::{
    clinician_link_row::clinician_link, currency_row::currency, invoice_row::invoice::dsl::*,
    item_link_row::item_link, name_link_row::name_link, store_row::store, user_row::user_account,
    StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::{dsl::max, prelude::*};

use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use util::Defaults;

table! {
    invoice (id) {
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
        verified_datetime -> Nullable<Timestamp>,
        colour -> Nullable<Text>,
        requisition_id -> Nullable<Text>,
        linked_invoice_id -> Nullable<Text>,
        tax_percentage -> Nullable<Double>,
        currency_id -> Nullable<Text>,
        currency_rate -> Double,
        clinician_link_id -> Nullable<Text>,
        original_shipment_id -> Nullable<Text>,
    }
}

joinable!(invoice -> name_link (name_link_id));
joinable!(invoice -> store (store_id));
joinable!(invoice -> user_account (user_id));
joinable!(invoice -> currency (currency_id));
joinable!(invoice -> clinician_link (clinician_link_id));
allow_tables_to_appear_in_same_query!(invoice, item_link);
allow_tables_to_appear_in_same_query!(invoice, name_link);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceType {
    OutboundShipment,
    InboundShipment,
    Prescription,
    // Initially we had single inventory adjustment InvoiceType, this was changed to two separate types
    // central server may have old inventory adjustment type, thus map it to inventory additions
    #[serde(alias = "INVENTORY_ADJUSTMENT")]
    InventoryAddition,
    InventoryReduction,
    Repack,
    InboundReturn,
    OutboundReturn,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceStatus {
    New,
    Allocated,
    Picked,
    Shipped,
    Delivered,
    Verified,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = invoice)]
pub struct InvoiceRow {
    pub id: String,
    pub name_link_id: String,
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
    pub verified_datetime: Option<NaiveDateTime>,
    pub colour: Option<String>,
    pub requisition_id: Option<String>,
    pub linked_invoice_id: Option<String>,
    pub tax_percentage: Option<f64>,
    pub currency_id: Option<String>,
    pub currency_rate: f64,
    pub clinician_link_id: Option<String>,
    pub original_shipment_id: Option<String>,
}

impl Default for InvoiceRow {
    fn default() -> Self {
        Self {
            created_datetime: Defaults::naive_date_time(),
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::New,
            // Defaults
            id: Default::default(),
            user_id: Default::default(),
            name_link_id: Default::default(),
            name_store_id: Default::default(),
            store_id: Default::default(),
            invoice_number: Default::default(),
            on_hold: Default::default(),
            comment: Default::default(),
            their_reference: Default::default(),
            transport_reference: Default::default(),
            allocated_datetime: Default::default(),
            picked_datetime: Default::default(),
            shipped_datetime: Default::default(),
            delivered_datetime: Default::default(),
            verified_datetime: Default::default(),
            colour: Default::default(),
            requisition_id: Default::default(),
            linked_invoice_id: Default::default(),
            tax_percentage: Default::default(),
            currency_id: Default::default(),
            currency_rate: Default::default(),
            clinician_link_id: Default::default(),
            original_shipment_id: Default::default(),
        }
    }
}

pub struct InvoiceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &InvoiceRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(invoice)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
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
            name_link_id: Some(row.name_link_id.clone()),
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

        diesel::delete(invoice.filter(id.eq(invoice_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, invoice_id: &str) -> Result<Option<InvoiceRow>, RepositoryError> {
        let result = invoice
            .filter(id.eq(invoice_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<InvoiceRow>, RepositoryError> {
        let result = invoice
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_max_invoice_number(
        &self,
        r#type: InvoiceType,
        store: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = invoice
            .filter(type_.eq(r#type).and(store_id.eq(store)))
            .select(max(invoice_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct InvoiceRowDelete(pub String);
impl Delete for InvoiceRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = InvoiceRowRepository::new(con).delete(&self.0)?;
        // TODO: Do we need to do something with change_log_id?
        Ok(())
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
