use crate::server::service::graphql::schema::{
    mutations::error::{DatabaseError, ForeignKeyError, RecordDoesNotExistError},
    types::invoice_query::{InvoiceLines, InvoiceNode, InvoiceStatus, InvoiceType},
};

use super::{
    CannotChangeInvoiceBackToDraftError, CannotEditFinalisedInvoiceError,
    InvoiceDoesNotBelongToCurrentStoreError, NotACustomerInvoiceError, OtherPartyNotASupplierError,
};

use async_graphql::{Context, InputObject, Interface, SimpleObject, Union};

#[derive(InputObject)]
pub struct UpdateCustomerInvoiceInput {
    id: String,
    other_party_id: String,
    status: Option<InvoiceStatus>,
    comment: Option<String>,
    their_reference: Option<String>,
}

#[derive(Union)]
pub enum UpdateCustomerInvoiceResultUnion {
    Ok(UpdateCustomerInvoiceOk),
    Error(UpdateCustomerInvoiceError),
}

#[derive(SimpleObject)]
pub struct UpdateCustomerInvoiceOk {
    invoice: InvoiceNode,
}

#[derive(SimpleObject)]
pub struct UpdateCustomerInvoiceError {
    error: UpdateCustomerInvoiceErrorInterface,
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateCustomerInvoiceErrorInterface {
    ForeignKeyError(ForeignKeyError),
    RecordDoesNotExistError(RecordDoesNotExistError),
    NotASupplierInvoiceError(NotACustomerInvoiceError),
    OtherPartyNotASupplierError(OtherPartyNotASupplierError),
    CannotEditFinalisedInvoiceError(CannotEditFinalisedInvoiceError),
    InvoiceDoesNotBelongToCurrentStoreError(InvoiceDoesNotBelongToCurrentStoreError),
    CannotChangeInvoiceBackToDraftError(CannotChangeInvoiceBackToDraftError),
    DatabasseError(DatabaseError),
}

pub async fn update_customer_invoice(
    _ctx: &Context<'_>,
    _input: UpdateCustomerInvoiceInput,
) -> UpdateCustomerInvoiceResultUnion {
    // TODO: add update logic.
    UpdateCustomerInvoiceResultUnion::Ok(UpdateCustomerInvoiceOk {
        invoice: InvoiceNode {
            id: "".to_string(),
            other_party_name: "".to_string(),
            other_party_id: "".to_string(),
            status: InvoiceStatus::Draft,
            invoice_type: InvoiceType::CustomerInvoice,
            invoice_number: 0,
            their_reference: None,
            comment: None,
            entry_datetime: "".to_string(),
            confirm_datetime: None,
            finalised_datetime: None,
            lines: InvoiceLines {
                invoice_id: "".to_string(),
            },
        },
    })
}
