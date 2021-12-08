use async_graphql::*;
use domain::shipment_tax_update::ShipmentTaxUpdate;

use crate::schema::{
    mutations::{
        tax_update_input::TaxUpdate, CannotEditInvoice, ForeignKey, ForeignKeyError,
        InvoiceLineBelongsToAnotherInvoice, NotAnOutboundShipment,
    },
    types::{
        get_invoice_line_response, DatabaseError, ErrorWrapper, InternalError, InvoiceLineNode,
        InvoiceLineResponse, NodeErrorInterface, RecordNotFound,
    },
};
use repository::StorageConnectionManager;
use service::invoice_line::{
    update_outbound_shipment_service_line, UpdateOutboundShipmentServiceLine,
    UpdateOutboundShipmentServiceLineError,
};

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
                NodeErrorInterface::DatabaseError(err) => {
                    UpdateOutboundShipmentServiceLineErrorInterface::DatabaseError(err)
                }
                NodeErrorInterface::RecordNotFound(_) => {
                    UpdateOutboundShipmentServiceLineErrorInterface::InternalError(InternalError(
                        "Update item went missing!".to_string(),
                    ))
                }
            };
            UpdateOutboundShipmentServiceLineResponse::Error(ErrorWrapper { error })
        }
    }
}

#[derive(Union)]
pub enum UpdateOutboundShipmentServiceLineResponse {
    Error(ErrorWrapper<UpdateOutboundShipmentServiceLineErrorInterface>),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateOutboundShipmentServiceLineErrorInterface {
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
        use UpdateOutboundShipmentServiceLineErrorInterface as OutError;
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
            UpdateOutboundShipmentServiceLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
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

        UpdateOutboundShipmentServiceLineResponse::Error(ErrorWrapper { error })
    }
}
