use async_graphql::*;
use chrono::NaiveDate;

use crate::server::service::graphql::schema::{
    mutations::{
        CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
        InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment,
    },
    types::{
        get_invoice_line_response, DatabaseError, ErrorWrapper, InvoiceLineResponse, Range,
        RangeError, RangeField, RecordNotFound,
    },
};
use domain::inbound_shipment::UpdateInboundShipmentLine;
use repository::repository::StorageConnectionManager;
use service::invoice_line::{update_inbound_shipment_line, UpdateInboundShipmentLineError};

use super::{BatchIsReserved, InvoiceLineBelongsToAnotherInvoice};

#[derive(InputObject)]
pub struct UpdateInboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub pack_size: Option<u32>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<u32>,
}

#[derive(Union)]
pub enum UpdateInboundShipmentLineResponse {
    Error(ErrorWrapper<UpdateInboundShipmentLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

pub fn get_update_inbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: UpdateInboundShipmentLineInput,
) -> UpdateInboundShipmentLineResponse {
    use UpdateInboundShipmentLineResponse::*;
    match update_inbound_shipment_line(connection_manager, input.into()) {
        Ok(id) => Response(get_invoice_line_response(connection_manager, id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateInboundShipmentLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    BatchIsReserved(BatchIsReserved),
    RangeError(RangeError),
}

impl From<UpdateInboundShipmentLineInput> for UpdateInboundShipmentLine {
    fn from(
        UpdateInboundShipmentLineInput {
            id,
            invoice_id,
            item_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
        }: UpdateInboundShipmentLineInput,
    ) -> Self {
        UpdateInboundShipmentLine {
            id,
            invoice_id,
            item_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
        }
    }
}

impl From<UpdateInboundShipmentLineError> for UpdateInboundShipmentLineResponse {
    fn from(error: UpdateInboundShipmentLineError) -> Self {
        use UpdateInboundShipmentLineErrorInterface as OutError;
        let error = match error {
            UpdateInboundShipmentLineError::LineDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            UpdateInboundShipmentLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateInboundShipmentLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            UpdateInboundShipmentLineError::NotAnInboundShipment => {
                OutError::NotAnInboundShipment(NotAnInboundShipment {})
            }
            UpdateInboundShipmentLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            UpdateInboundShipmentLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            UpdateInboundShipmentLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            UpdateInboundShipmentLineError::NumberOfPacksBelowOne => {
                OutError::RangeError(RangeError {
                    field: RangeField::NumberOfPacks,
                    range: Range::Min(1),
                })
            }
            UpdateInboundShipmentLineError::PackSizeBelowOne => OutError::RangeError(RangeError {
                field: RangeField::PackSize,
                range: Range::Min(1),
            }),
            UpdateInboundShipmentLineError::BatchIsReserved => {
                OutError::BatchIsReserved(BatchIsReserved {})
            }
            UpdateInboundShipmentLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
            }
        };

        UpdateInboundShipmentLineResponse::Error(ErrorWrapper { error })
    }
}
