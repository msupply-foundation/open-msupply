use async_graphql::*;

use crate::server::service::graphql::schema::{
    mutations::{
        CannotEditFinalisedInvoice, ForeignKeyError, InvoiceDoesNotBelongToCurrentStore,
        NotACustomerInvoice, RecordAlreadyExist,
    },
    types::{DatabaseError, ErrorWrapper, InvoiceLineResponse, RangeError},
};

#[derive(InputObject)]
pub struct InsertCustomerInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
}

#[derive(Union)]
pub enum InsertCustomerInvoiceLineResponse {
    Error(ErrorWrapper<InsertCustomerInvoiceLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertCustomerInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    RangeError(RangeError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotACustomerInvoice(NotACustomerInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}
