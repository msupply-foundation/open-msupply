use crate::{
    domain::{
        customer_invoice::InsertCustomerInvoice,
        invoice::{Invoice, InvoiceStatus},
    },
    server::service::graphql::schema::{
        mutations::{
            customer_invoice::OtherPartyIdNotFoundError, ForeignKey, ForeignKeyError,
            RecordAlreadyExist,
        },
        types::{DatabaseError, ErrorWrapper, InvoiceNodeStatus, InvoiceResponse, NameNode},
    },
    service::{invoice::InsertCustomerInvoiceError, SingleRecordError},
};

use super::{OtherPartyCannotBeThisStoreError, OtherPartyNotACustomerError};

use async_graphql::{InputObject, Interface, Union};

use async_graphql::*;

#[derive(InputObject)]
pub struct InsertCustomerInvoiceInput {
    /// The new invoice id provided by the client
    id: String,
    /// The other party must be an customer of the current store
    other_party_id: String,
    status: Option<InvoiceNodeStatus>,
    comment: Option<String>,
    their_reference: Option<String>,
}

impl From<InsertCustomerInvoiceInput> for InsertCustomerInvoice {
    fn from(input: InsertCustomerInvoiceInput) -> Self {
        InsertCustomerInvoice {
            id: input.id,
            other_party_id: input.other_party_id,
            status: input
                .status
                .map(|s| s.into())
                .unwrap_or(InvoiceStatus::Draft),
            comment: input.comment,
            their_reference: input.their_reference,
        }
    }
}

#[derive(Union)]
pub enum InsertCustomerInvoiceResponse {
    Error(ErrorWrapper<InsertCustomerInvoiceErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertCustomerInvoiceErrorInterface {
    InvoiceAlreadyExists(RecordAlreadyExist),
    ForeignKeyError(ForeignKeyError),
    OtherPartyIdNotFound(OtherPartyIdNotFoundError),
    OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError),
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
    DatabaseError(DatabaseError),
}

impl From<Result<Invoice, SingleRecordError>> for InsertCustomerInvoiceResponse {
    fn from(result: Result<Invoice, SingleRecordError>) -> Self {
        let invoice_response: InvoiceResponse = result.into();
        // Implemented by flatten union
        invoice_response.into()
    }
}

impl From<InsertCustomerInvoiceError> for InsertCustomerInvoiceResponse {
    fn from(error: InsertCustomerInvoiceError) -> Self {
        use InsertCustomerInvoiceErrorInterface as OutError;
        let error = match error {
            InsertCustomerInvoiceError::OtherPartyCannotBeThisStore => {
                OutError::OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError {})
            }
            InsertCustomerInvoiceError::OtherPartyIdNotFound(_) => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::OtherPartyId))
            }
            InsertCustomerInvoiceError::OtherPartyNotACustomer(name) => {
                OutError::OtherPartyNotACustomer(OtherPartyNotACustomerError(NameNode { name }))
            }
            InsertCustomerInvoiceError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertCustomerInvoiceError::InvoiceAlreadyExists => {
                OutError::InvoiceAlreadyExists(RecordAlreadyExist {})
            }
        };

        InsertCustomerInvoiceResponse::Error(ErrorWrapper { error })
    }
}
