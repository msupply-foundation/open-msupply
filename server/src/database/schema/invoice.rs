use super::diesel_schema::invoice;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceRowType {
    CustomerInvoice,
    SupplierInvoice,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceRowStatus {
    Draft,
    Confirmed,
    Finalised,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "invoice"]
pub struct InvoiceRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub invoice_number: i32,
    #[column_name = "type_"]
    pub r#type: InvoiceRowType,
    pub status: InvoiceRowStatus,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub entry_datetime: String,
    pub confirm_datetime: Option<String>,
    pub finalised_datetime: Option<String>,
}
