use async_graphql::*;

use crate::server::service::graphql::schema::{
    mutations::{
        CannotEditFinalisedInvoice, ForeignKeyError, InvoiceDoesNotBelongToCurrentStore,
        InvoiceLineBelongsToAnotherInvoice, NotACustomerInvoice, NumberOfPacksAboveZero,
        RecordDoesNotExist,
    },
    types::{DatabaseError, ErrorWrapper, InvoiceLineResponse, RangeError},
};

#[derive(InputObject)]
pub struct UpdateCustomerInvoiceLineInput {
    id: String,
    invoice_id: String,
    item_id: String,
    stock_line_id: String,
    number_of_packs: u32,
}

#[derive(Union)]
pub enum UpdateCustomerInvoiceLineResponse {
    Error(ErrorWrapper<UpdateCustomerInvoiceLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateCustomerInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordDoesNotExist(RecordDoesNotExist),
    NumberOfPacksAboveZero(NumberOfPacksAboveZero),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    NotACustomerInvoice(NotACustomerInvoice),
    RangeError(RangeError),
}
