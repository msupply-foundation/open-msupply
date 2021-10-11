use async_graphql::*;

use crate::server::service::graphql::schema::{
    mutations::{
        CannotEditFinalisedInvoice, DeleteResponse, InvoiceDoesNotBelongToCurrentStore,
        NotASupplierInvoice, RecordDoesNotExist,
    },
    types::{DatabaseError, ErrorWrapper},
};

use super::CannotDeleteInvoiceWithLines;

#[derive(InputObject)]
pub struct DeleteSupplierInvoiceInput {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteSupplierInvoiceResponse {
    Error(ErrorWrapper<DeleteSupplierInvoiceErrorInterface>),
    DeleteResponse(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteSupplierInvoiceErrorInterface {
    DatabaseError(DatabaseError),
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}
