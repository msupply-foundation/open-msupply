use async_graphql::*;

use crate::server::service::graphql::schema::{
    mutations::{
        CannotEditFinalisedInvoice, DeleteResponse, ForeignKeyError,
        InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice,
        NotASupplierInvoice, RecordDoesNotExist,
    },
    types::{DatabaseError, ErrorWrapper},
};

#[derive(InputObject)]
pub struct DeleteCustomerInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(Union)]
pub enum DeleteCustomerInvoiceLineResponse {
    Error(ErrorWrapper<DeleteCustomerInvoiceLineErrorInterface>),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteCustomerInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    RecordDoesNotExist(RecordDoesNotExist),
    ForeignKeyError(ForeignKeyError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotACustomerInvoice(NotASupplierInvoice),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}
