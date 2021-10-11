use async_graphql::*;
use chrono::NaiveDate;

use crate::server::service::graphql::schema::{
    mutations::{
        supplier_invoice::{NumberOfPacksAboveZero, PackSizeAboveZero},
        CannotEditFinalisedInvoice, ForeignKeyError, InvoiceDoesNotBelongToCurrentStore,
        NotASupplierInvoice, RecordAlreadyExist,
    },
    types::{DatabaseError, ErrorWrapper, InvoiceLineNode},
};

#[derive(InputObject)]
pub struct InsertSupplierInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub pack_size: u32,
    pub batch: Option<String>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: u32,
}

#[derive(Union)]
pub enum InsertSupplierInvoiceLineResponse {
    Error(ErrorWrapper<InsertSupplierInvoiceLineErrorInterface>),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertSupplierInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    PackSizeAboveOne(PackSizeAboveZero),
    NumberOfPacksAboveZero(NumberOfPacksAboveZero),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}
