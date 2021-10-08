use crate::server::service::graphql::schema::mutations::error::DatabaseError;

use super::{
    CanOnlyEditInvoicesInLoggedInStoreError, FinalisedInvoiceIsNotEditableError,
    InvoiceNotFoundError,
};

use async_graphql::{Context, InputObject, Interface, SimpleObject, Union};

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

pub async fn delete_customer_invoice(
    _ctx: &Context<'_>,
    input: DeleteCustomerInvoiceInput,
) -> DeleteCustomerInvoiceResultUnion {
    // TODO: add deletion logic.
    DeleteCustomerInvoiceResultUnion::Error(DeleteCustomerInvoiceError {
        error: DeleteCustomerInvoiceErrorInterface::InvoiceNotFound(InvoiceNotFoundError(input.id)),
    })
}
