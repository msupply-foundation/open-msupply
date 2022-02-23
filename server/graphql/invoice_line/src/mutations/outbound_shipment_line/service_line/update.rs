use async_graphql::*;
use domain::shipment_tax_update::ShipmentTaxUpdate;

use graphql_core::simple_generic_errors::{
    CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError, InternalError, InvoiceLineBelongsToAnotherInvoice,
    NodeErrorInterface, NotAnOutboundShipment, RecordNotFound,
};
use graphql_types::types::{
    get_invoice_line_response, InvoiceLineNode, InvoiceLineResponse,
};
use repository::StorageConnectionManager;
use service::invoice_line::{
    update_outbound_shipment_service_line, UpdateOutboundShipmentServiceLine,
    UpdateOutboundShipmentServiceLineError,
};

use crate::mutations::outbound_shipment_line::TaxUpdate;

use super::NotAServiceItem;

#[derive(InputObject)]
pub struct UpdateOutboundShipmentServiceLineInput {
    pub id: String,
    invoice_id: String,
    item_id: Option<String>,
    name: Option<String>,
    total_before_tax: Option<f64>,
    total_after_tax: Option<f64>,
    tax: Option<TaxUpdate>,
    note: Option<String>,
}

pub fn get_update_outbound_shipment_service_line_response(
    connection_manager: &StorageConnectionManager,
    input: UpdateOutboundShipmentServiceLineInput,
) -> UpdateOutboundShipmentServiceLineResponse {
    use UpdateOutboundShipmentServiceLineResponse::*;

    let id = match update_outbound_shipment_service_line(
        connection_manager,
        UpdateOutboundShipmentServiceLine {
            id: input.id,
            invoice_id: input.invoice_id,
            item_id: input.item_id,
            name: input.name,
            total_before_tax: input.total_before_tax,
            total_after_tax: input.total_after_tax,
            tax: input.tax.map(|tax| ShipmentTaxUpdate {
                percentage: tax.percentage,
            }),
            note: input.note,
        },
    ) {
        Ok(id) => id,
        Err(error) => return error.into(),
    };

    match get_invoice_line_response(connection_manager, id) {
        InvoiceLineResponse::Response(node) => Response(node),
        InvoiceLineResponse::Error(err) => {
            let error = match err.error {
                NodeErrorInterface::DatabaseError(err) => UpdateErrorInterface::DatabaseError(err),
                NodeErrorInterface::RecordNotFound(_) => UpdateErrorInterface::InternalError(
                    InternalError("Update item went missing!".to_string()),
                ),
            };
            UpdateOutboundShipmentServiceLineResponse::Error(UpdateError { error })
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentServiceLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
pub enum UpdateOutboundShipmentServiceLineResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(name = "UpdateOutboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    InternalError(InternalError),
    DatabaseError(DatabaseError),
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    NotAnOutboundShipment(NotAnOutboundShipment),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    CannotEditInvoice(CannotEditInvoice),
    NotAServiceItem(NotAServiceItem),
}

impl From<UpdateOutboundShipmentServiceLineError> for UpdateOutboundShipmentServiceLineResponse {
    fn from(error: UpdateOutboundShipmentServiceLineError) -> Self {
        use UpdateErrorInterface as OutError;
        let error = match error {
            UpdateOutboundShipmentServiceLineError::LineDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            UpdateOutboundShipmentServiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateOutboundShipmentServiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            UpdateOutboundShipmentServiceLineError::NotAnOutboundShipment => {
                OutError::NotAnOutboundShipment(NotAnOutboundShipment {})
            }
            UpdateOutboundShipmentServiceLineError::NotThisInvoiceLine(_invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice {})
            }
            UpdateOutboundShipmentServiceLineError::CannotEditFinalised => {
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }
            UpdateOutboundShipmentServiceLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            UpdateOutboundShipmentServiceLineError::NotAServiceItem => {
                OutError::NotAServiceItem(NotAServiceItem)
            }
        };

        UpdateOutboundShipmentServiceLineResponse::Error(UpdateError { error })
    }
}
