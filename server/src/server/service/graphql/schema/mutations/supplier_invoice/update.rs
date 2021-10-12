use async_graphql::*;

use crate::{
    domain::{
        invoice::{Invoice, InvoiceStatus},
        supplier_invoice::UpdateSupplierInvoice,
    },
    server::service::graphql::schema::{
        mutations::{
            CannotChangeInvoiceBackToDraft, CannotEditFinalisedInvoice, ForeignKey,
            ForeignKeyError, InvoiceDoesNotBelongToCurrentStore, NotASupplierInvoice,
            RecordDoesNotExist,
        },
        types::{DatabaseError, ErrorWrapper, InvoiceNodeStatus, InvoiceResponse, NameNode},
    },
    service::{invoice::UpdateSupplierInvoiceError, SingleRecordError},
};

use super::OtherPartyNotASupplier;

#[derive(InputObject)]
pub struct UpdateSupplierInvoiceInput {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<InvoiceNodeStatus>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

#[derive(Union)]
pub enum UpdateSupplierInvoiceResponse {
    Error(ErrorWrapper<UpdateSupplierInvoiceErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateSupplierInvoiceErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordDoesNotExist(RecordDoesNotExist),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotChangeInvoiceBackToDraft(CannotChangeInvoiceBackToDraft),
}

impl From<UpdateSupplierInvoiceInput> for UpdateSupplierInvoice {
    fn from(
        UpdateSupplierInvoiceInput {
            id,
            other_party_id,
            status,
            comment,
            their_reference,
        }: UpdateSupplierInvoiceInput,
    ) -> Self {
        UpdateSupplierInvoice {
            id,
            other_party_id,
            status: status.map(InvoiceStatus::from),
            comment,
            their_reference,
        }
    }
}

impl From<Result<Invoice, SingleRecordError>> for UpdateSupplierInvoiceResponse {
    fn from(result: Result<Invoice, SingleRecordError>) -> Self {
        let invoice_response: InvoiceResponse = result.into();
        // Implemented by flatten union
        invoice_response.into()
    }
}

impl From<UpdateSupplierInvoiceError> for UpdateSupplierInvoiceResponse {
    fn from(error: UpdateSupplierInvoiceError) -> Self {
        use UpdateSupplierInvoiceErrorInterface as OutError;
        let error = match error {
            UpdateSupplierInvoiceError::InvoiceDoesNotExists => {
                OutError::RecordDoesNotExist(RecordDoesNotExist {})
            }
            UpdateSupplierInvoiceError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateSupplierInvoiceError::OtherPartyDoesNotExists => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::OtherPartyId))
            }
            UpdateSupplierInvoiceError::OtherPartyNotASupplier(name) => {
                OutError::OtherPartyNotASupplier(OtherPartyNotASupplier(NameNode { name }))
            }
            UpdateSupplierInvoiceError::NotASupplierInvoice => {
                OutError::NotASupplierInvoice(NotASupplierInvoice {})
            }
            UpdateSupplierInvoiceError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            UpdateSupplierInvoiceError::CannotChangeInvoiceBackToDraft => {
                OutError::CannotChangeInvoiceBackToDraft(CannotChangeInvoiceBackToDraft {})
            }
            UpdateSupplierInvoiceError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
        };

        UpdateSupplierInvoiceResponse::Error(ErrorWrapper { error })
    }
}
