use super::diesel_schema::invoice;
use chrono::{NaiveDate, NaiveDateTime};
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceRowType {
    OutboundShipment,
    InboundShipment,
    InventoryAdjustment,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
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
    pub invoice_number: i64,
    #[column_name = "type_"]
    pub r#type: InvoiceRowType,
    pub status: InvoiceRowStatus,
    pub on_hold: bool,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
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
            id: String::default(),
            name_id: String::default(),
            name_store_id: None,
            store_id: String::default(),
            invoice_number: 0,
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(2022, 1, 22).and_hms(15, 16, 0),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
        }
    }
}
