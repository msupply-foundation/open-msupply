use crate::server::service::graphql::schema::mutations::error::{
    DatabaseError, ForeignKeyError, RecordDoesNotExistError,
};

use super::CannotDeleteFinalisedInvoiceError;

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
    CannotDeleteFinalisedInvoiceError(CannotDeleteFinalisedInvoiceError),
    DatabaseError(DatabaseError),
    RecordDoesNotExistError(RecordDoesNotExistError),
    ForeignKeyError(ForeignKeyError),
}

pub async fn delete_customer_invoice(
    _ctx: &Context<'_>,
    _input: DeleteCustomerInvoiceInput,
) -> DeleteCustomerInvoiceResultUnion {
    // TODO: add deletion logic.
    DeleteCustomerInvoiceResultUnion::Error(DeleteCustomerInvoiceError {
        error: DeleteCustomerInvoiceErrorInterface::CannotDeleteFinalisedInvoiceError(
            CannotDeleteFinalisedInvoiceError,
        ),
    })
}
