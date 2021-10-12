use crate::server::service::graphql::schema::mutations::error::DatabaseError;

use super::{
    CanOnlyEditInvoicesInLoggedInStoreError, FinalisedInvoiceIsNotEditableError,
    InvoiceNotFoundError,
};

use async_graphql:: InputObject, Interface, SimpleObject, Union};

#[derive(InputObject)]
pub struct DeleteCustomerInvoiceInput {
    id: String,
}

#[derive(Union)]
pub enum DeleteCustomerInvoiceResultUnion {
    Ok(DeleteCustomerInvoiceOk),
    Error(DeleteCustomerInvoiceError),
}

#[derive(SimpleObject)]
pub struct DeleteCustomerInvoiceOk {
    invoice_id: String,
}

#[derive(SimpleObject)]
pub struct DeleteCustomerInvoiceError {
    error: DeleteCustomerInvoiceErrorInterface,
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteCustomerInvoiceErrorInterface {
    CanOnlyEditInvoicesInLoggedInStore(CanOnlyEditInvoicesInLoggedInStoreError),
    FinalisedInvoiceIsNotEditable(FinalisedInvoiceIsNotEditableError),
    InvoiceNotFound(InvoiceNotFoundError),
    DatabaseError(DatabaseError),
}
