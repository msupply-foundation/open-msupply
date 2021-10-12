use async_graphql::*;

use crate::server::service::graphql::schema::{
    mutations::{
        CannotEditFinalisedInvoice, DeleteResponse, InvoiceDoesNotBelongToCurrentStore,
        NotASupplierInvoice, RecordDoesNotExist,
    },
    types::{DatabaseError, ErrorWrapper},
};

use super::{InvoiceLineBelongsToAnotherInvoice, InvoiceLineIsReserved};

#[derive(InputObject)]
pub struct DeleteSupplierInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(Union)]
pub enum DeleteSupplierInvoiceLineResponse {
    Error(ErrorWrapper<DeleteSupplierInvoiceLineErrorInterface>),
    DeleteResponse(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteSupplierInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    InvoiceLineIsReserved(InvoiceLineIsReserved),
}
