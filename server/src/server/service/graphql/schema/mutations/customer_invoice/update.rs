use crate::{
    domain::{
        customer_invoice::UpdateCustomerInvoice,
        invoice::{Invoice, InvoiceStatus},
    },
    server::service::graphql::schema::{
        mutations::{
            customer_invoice::{InvoiceLineHasNoStockLineError, NotACustomerInvoiceError},
            error::DatabaseError,
        },
        types::{ErrorWrapper, InvoiceNodeStatus, InvoiceResponse, NameNode},
    },
    service::{invoice::UpdateCustomerInvoiceError, SingleRecordError},
};

use super::{
    CanOnlyEditInvoicesInLoggedInStoreError, CannotChangeStatusBackToDraftError,
    FinalisedInvoiceIsNotEditableError, InvoiceNotFoundError, OtherPartyCannotBeThisStoreError,
    OtherPartyIdNotFoundError, OtherPartyNotACustomerError,
};

use async_graphql::{InputObject, Interface, Union};

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

impl From<UpdateCustomerInvoiceInput> for UpdateCustomerInvoice {
    fn from(input: UpdateCustomerInvoiceInput) -> Self {
        UpdateCustomerInvoice {
            id: input.id,
            other_party_id: input.other_party_id,
            status: input.status.map(InvoiceStatus::from),
            comment: input.comment,
            their_reference: input.their_reference,
        }
    }
}

#[derive(Union)]
pub enum UpdateCustomerInvoiceResponse {
    Error(ErrorWrapper<UpdateCustomerInvoiceErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

impl From<Result<Invoice, SingleRecordError>> for UpdateCustomerInvoiceResponse {
    fn from(result: Result<Invoice, SingleRecordError>) -> Self {
        let invoice_response: InvoiceResponse = result.into();
        // Implemented by flatten union
        invoice_response.into()
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateCustomerInvoiceErrorInterface {
    CannotChangeInvoiceBackToDraft(CannotChangeStatusBackToDraftError),
    CanOnlyEditInvoicesInLoggedInStore(CanOnlyEditInvoicesInLoggedInStoreError),
    InvoiceIsFinalised(FinalisedInvoiceIsNotEditableError),
    InvoiceDoesNotExists(InvoiceNotFoundError),
    OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError),
    OtherPartyDoesNotExists(OtherPartyIdNotFoundError),
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
    NotACustomerInvoice(NotACustomerInvoiceError),
    DatabaseError(DatabaseError),
    InvalidInvoiceLine(InvoiceLineHasNoStockLineError),
}

impl From<UpdateCustomerInvoiceError> for UpdateCustomerInvoiceResponse {
    fn from(error: UpdateCustomerInvoiceError) -> Self {
        use UpdateCustomerInvoiceErrorInterface as OutError;
        let error = match error {
            UpdateCustomerInvoiceError::CannotChangeInvoiceBackToDraft => {
                OutError::CannotChangeInvoiceBackToDraft(CannotChangeStatusBackToDraftError {})
            }
            UpdateCustomerInvoiceError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateCustomerInvoiceError::InvoiceDoesNotExists => {
                OutError::InvoiceDoesNotExists(InvoiceNotFoundError {})
            }
            UpdateCustomerInvoiceError::InvoiceIsFinalised => {
                OutError::InvoiceIsFinalised(FinalisedInvoiceIsNotEditableError {})
            }
            UpdateCustomerInvoiceError::OtherPartyDoesNotExists => {
                OutError::OtherPartyDoesNotExists(OtherPartyIdNotFoundError {})
            }
            UpdateCustomerInvoiceError::OtherPartyNotACustomer(name) => {
                OutError::OtherPartyNotACustomer(OtherPartyNotACustomerError(NameNode { name }))
            }
            UpdateCustomerInvoiceError::OtherPartyCannotBeThisStore => {
                OutError::OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError {})
            }
            UpdateCustomerInvoiceError::InvoiceLineHasNoStockLine(id) => {
                OutError::InvalidInvoiceLine(InvoiceLineHasNoStockLineError(id))
            }
            UpdateCustomerInvoiceError::NotACustomerInvoice => {
                OutError::NotACustomerInvoice(NotACustomerInvoiceError {})
            }
        };

        UpdateCustomerInvoiceResponse::Error(ErrorWrapper { error })
    }
}
