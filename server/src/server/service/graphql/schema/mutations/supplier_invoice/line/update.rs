use async_graphql::*;
use chrono::NaiveDate;

use crate::server::service::graphql::schema::{
    mutations::{
        supplier_invoice::{NumberOfPacksAboveZero, PackSizeAboveZero},
        CannotEditFinalisedInvoice, ForeignKeyError, InvoiceDoesNotBelongToCurrentStore,
        NotASupplierInvoice, RecordDoesNotExist,
    },
    types::{DatabaseError, ErrorWrapper, InvoiceLineNode},
};

use super::InvoiceLineBelongsToAnotherInvoice;

#[derive(InputObject)]
pub struct UpdateSupplierInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub pack_size: Option<u32>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<u32>,
}

#[derive(Union)]
pub enum UpdateSupplierInvoiceLineResponse {
    Error(ErrorWrapper<UpdateSupplierInvoiceLineErrorInterface>),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateSupplierInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordDoesNotExist(RecordDoesNotExist),
    PackSizeAboveOne(PackSizeAboveZero),
    NumberOfPacksAboveZero(NumberOfPacksAboveZero),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
}
