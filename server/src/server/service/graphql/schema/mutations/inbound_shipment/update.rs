use async_graphql::*;

use crate::{
    domain::{
        inbound_shipment::UpdateInboundShipment,
        invoice::{Invoice, InvoiceStatus},
    },
    server::service::graphql::schema::{
        mutations::{
            CannotChangeInvoiceBackToDraft, CannotEditFinalisedInvoice, ForeignKey,
            ForeignKeyError, InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment,
        },
        types::{
            DatabaseError, ErrorWrapper, InvoiceNodeStatus, InvoiceResponse, NameNode,
            RecordNotFound,
        },
    },
    service::{invoice::UpdateInboundShipmentError, SingleRecordError},
};

use super::OtherPartyNotASupplier;

#[derive(InputObject)]
pub struct UpdateInboundShipmentInput {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<InvoiceNodeStatus>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

#[derive(Union)]
pub enum UpdateInboundShipmentResponse {
    Error(ErrorWrapper<UpdateInboundShipmentErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateInboundShipmentErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotChangeInvoiceBackToDraft(CannotChangeInvoiceBackToDraft),
}

impl From<UpdateInboundShipmentInput> for UpdateInboundShipment {
    fn from(
        UpdateInboundShipmentInput {
            id,
            other_party_id,
            status,
            comment,
            their_reference,
        }: UpdateInboundShipmentInput,
    ) -> Self {
        UpdateInboundShipment {
            id,
            other_party_id,
            status: status.map(InvoiceStatus::from),
            comment,
            their_reference,
        }
    }
}

impl From<Result<Invoice, SingleRecordError>> for UpdateInboundShipmentResponse {
    fn from(result: Result<Invoice, SingleRecordError>) -> Self {
        let invoice_response: InvoiceResponse = result.into();
        // Implemented by flatten union
        invoice_response.into()
    }
}

impl From<UpdateInboundShipmentError> for UpdateInboundShipmentResponse {
    fn from(error: UpdateInboundShipmentError) -> Self {
        use UpdateInboundShipmentErrorInterface as OutError;
        let error = match error {
            UpdateInboundShipmentError::InvoiceDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            UpdateInboundShipmentError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateInboundShipmentError::OtherPartyDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::OtherPartyId))
            }
            UpdateInboundShipmentError::OtherPartyNotASupplier(name) => {
                OutError::OtherPartyNotASupplier(OtherPartyNotASupplier(NameNode { name }))
            }
            UpdateInboundShipmentError::NotAnInboundShipment => {
                OutError::NotAnInboundShipment(NotAnInboundShipment {})
            }
            UpdateInboundShipmentError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            UpdateInboundShipmentError::CannotChangeInvoiceBackToDraft => {
                OutError::CannotChangeInvoiceBackToDraft(CannotChangeInvoiceBackToDraft {})
            }
            UpdateInboundShipmentError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
        };

        UpdateInboundShipmentResponse::Error(ErrorWrapper { error })
    }
}
