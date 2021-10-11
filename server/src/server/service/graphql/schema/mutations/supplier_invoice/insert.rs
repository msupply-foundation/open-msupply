use async_graphql::*;

use crate::{
    domain::{invoice::Invoice, supplier_invoice::InsertSupplierInvoice},
    server::service::graphql::schema::{
        mutations::{ForeignKey, ForeignKeyError, RecordAlreadyExist},
        types::{DatabaseError, ErrorWrapper, InvoiceNodeStatus, InvoiceResponse, NameNode},
    },
    service::{invoice::InsertSupplierInvoiceError, SingleRecordError},
};

use super::OtherPartyNotASupplier;

#[derive(InputObject)]
pub struct InsertSupplierInvoiceInput {
    pub id: String,
    pub other_party_id: String,
    pub status: InvoiceNodeStatus,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

#[derive(Union)]
pub enum InsertSupplierInvoiceResponse {
    Error(ErrorWrapper<InsertSupplierInvoiceErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertSupplierInvoiceErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}

impl From<InsertSupplierInvoiceInput> for InsertSupplierInvoice {
    fn from(
        InsertSupplierInvoiceInput {
            id,
            other_party_id,
            status,
            comment,
            their_reference,
        }: InsertSupplierInvoiceInput,
    ) -> Self {
        InsertSupplierInvoice {
            id,
            other_party_id,
            status: status.into(),
            comment,
            their_reference,
        }
    }
}

impl From<Result<Invoice, SingleRecordError>> for InsertSupplierInvoiceResponse {
    fn from(result: Result<Invoice, SingleRecordError>) -> Self {
        let invoice_response: InvoiceResponse = result.into();
        // Implemented by flatten union
        invoice_response.into()
    }
}

impl From<InsertSupplierInvoiceError> for InsertSupplierInvoiceResponse {
    fn from(error: InsertSupplierInvoiceError) -> Self {
        use InsertSupplierInvoiceErrorInterface as OutError;
        let error = match error {
            InsertSupplierInvoiceError::InvoiceAlreadyExists => {
                OutError::RecordAlreadyExist(RecordAlreadyExist {})
            }
            InsertSupplierInvoiceError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertSupplierInvoiceError::OtherPartyDoesNotExists => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::OtherPartyId))
            }
            InsertSupplierInvoiceError::OtherPartyNotASupplier(name) => {
                OutError::OtherPartyNotASupplier(OtherPartyNotASupplier(NameNode { name }))
            }
        };

        InsertSupplierInvoiceResponse::Error(ErrorWrapper { error })
    }
}
