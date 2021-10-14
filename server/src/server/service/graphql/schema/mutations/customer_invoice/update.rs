use crate::server::service::graphql::schema::{
    mutations::error::DatabaseError,
    types::{invoice_query::InvoiceNode, InvoiceNodeStatus},
};

use super::{
    CanOnlyEditInvoicesInLoggedInStoreError, CannotChangeStatusBackToDraftError,
    FinalisedInvoiceIsNotEditableError, InvoiceNotFoundError, OtherPartyCannotBeThisStoreError,
    OtherPartyIdMissingError, OtherPartyIdNotFoundError, OtherPartyNotACustomerError,
};

use async_graphql::{InputObject, Interface, SimpleObject, Union};

#[derive(InputObject)]
pub struct UpdateCustomerInvoiceInput {
    id: String,
    other_party_id: String,
    status: Option<InvoiceNodeStatus>,
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
    CannotChangeStatusBackToDraft(CannotChangeStatusBackToDraftError),
    CanOnlyEditInvoicesInLoggedInStore(CanOnlyEditInvoicesInLoggedInStoreError),
    FinalisedInvoiceIsNotEditable(FinalisedInvoiceIsNotEditableError),
    InvoiceNotFound(InvoiceNotFoundError),
    OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError),
    OtherPartyIdMissing(OtherPartyIdMissingError),
    OtherPartyIdNotFound(OtherPartyIdNotFoundError),
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
    DatabaseError(DatabaseError),
}
