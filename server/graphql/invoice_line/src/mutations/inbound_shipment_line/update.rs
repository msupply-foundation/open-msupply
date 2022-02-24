use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::simple_generic_errors::{
    CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError,
    InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice, NodeError,
    NotAnInboundShipment, Range, RangeError, RangeField, RecordNotFound,
};
use graphql_types::types::{get_invoice_line_response, InvoiceLineNode, InvoiceLineResponse};
use repository::StorageConnectionManager;
use service::invoice_line::{update_inbound_shipment_line, UpdateInboundShipmentLineError, UpdateInboundShipmentLine};

use super::BatchIsReserved;

#[derive(InputObject)]
pub struct UpdateInboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub location_id: Option<String>,
    pub pack_size: Option<u32>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<u32>,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateInboundShipmentLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
pub enum UpdateInboundShipmentLineResponse {
    Error(UpdateError),
    NodeError(NodeError),
    Response(InvoiceLineNode),
}

pub fn get_update_inbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: UpdateInboundShipmentLineInput,
) -> UpdateInboundShipmentLineResponse {
    use UpdateInboundShipmentLineResponse::*;
    match update_inbound_shipment_line(connection_manager, input.into()) {
        Ok(id) => match get_invoice_line_response(connection_manager, id) {
            InvoiceLineResponse::Response(node) => Response(node),
            InvoiceLineResponse::Error(err) => NodeError(err),
        },
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(name = "UpdateInboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
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
            location_id,
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
            location_id,
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
        use UpdateErrorInterface as OutError;
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
                OutError::CannotEditInvoice(CannotEditInvoice {})
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
            UpdateInboundShipmentLineError::NotThisInvoiceLine(_invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice {})
            }
            UpdateInboundShipmentLineError::LocationDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::LocationId))
            }
        };

        UpdateInboundShipmentLineResponse::Error(UpdateError { error })
    }
}
