use super::diesel_schema::invoice;
use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceRowType {
    OutboundShipment,
    InboundShipment,
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
#[table_name = "invoice"]
pub struct InvoiceRow {
    pub id: String,
    pub name_id: String,
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
    pub color: Option<String>,
}
