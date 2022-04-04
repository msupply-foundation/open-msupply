use super::diesel_schema::invoice;
use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use util::Defaults;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceRowType {
    OutboundShipment,
    InboundShipment,
    InventoryAdjustment,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceRowStatus {
    New,
    Allocated,
    Picked,
    Shipped,
    Delivered,
    Verified,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "invoice"]
pub struct InvoiceRow {
    pub id: String,
    pub name_id: String,
    pub name_store_id: Option<String>,
    pub store_id: String,
    pub user_id: Option<String>,
    pub invoice_number: i64,
    #[column_name = "type_"]
    pub r#type: InvoiceRowType,
    pub status: InvoiceRowStatus,
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
}

impl Default for InvoiceRow {
    fn default() -> Self {
        Self {
            created_datetime: Defaults::naive_date_time(),
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::New,
            // Defaults
            id: Default::default(),
            user_id: Default::default(),
            name_id: Default::default(),
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
        }
    }
}
