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
    /// The new invoice id provided by the client
    id: String,
    /// The other party must be a customer of the current store.
    /// This field can be used to change the other_party of an invoice
    other_party_id: Option<String>,
    /// When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
    /// existing invoice items gets updated.
    status: Option<InvoiceNodeStatus>,
    comment: Option<String>,
    /// External invoice reference, e.g. purchase or shipment number
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
