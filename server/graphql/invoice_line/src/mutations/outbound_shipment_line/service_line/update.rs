use async_graphql::*;

use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{
    simple_generic_errors::{
        CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError, InternalError,
        InvoiceLineBelongsToAnotherInvoice, NodeErrorInterface, NotAnOutboundShipment,
        RecordNotFound,
    },
    ContextExt,
};
use graphql_types::types::{InvoiceLineNode, InvoiceLineResponse};
use repository::StorageConnectionManager;
use service::invoice_line::{
    outbound_shipment_service_line::{
        UpdateOutboundShipmentServiceLine as ServiceInput,
        UpdateOutboundShipmentServiceLineError as ServiceError,
    },
    ShipmentTaxUpdate,
};

use crate::mutations::outbound_shipment_line::TaxUpdate;

use super::NotAServiceItem;

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundShipmentServiceLineInput")]
pub struct UpdateInput {
    pub id: String,
    invoice_id: String,
    item_id: Option<String>,
    name: Option<String>,
    total_before_tax: Option<f64>,
    total_after_tax: Option<f64>,
    tax: Option<TaxUpdate>,
    note: Option<String>,
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .invoice_line_service
        .update_outbound_shipment_service_line(&service_context, store_id, input.to_domain())
    {
        Ok(invoice_line) => UpdateResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentServiceLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundShipmentServiceLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(name = "UpdateOutboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
}

impl UpdateInput {
    fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            invoice_id,
            item_id,
            name,
            total_before_tax,
            total_after_tax,
            tax,
            note,
        } = self;

        ServiceInput {
            id,
            invoice_id,
            item_id,
            name,
            total_before_tax,
            total_after_tax,
            tax: tax.map(|tax| ShipmentTaxUpdate {
                percentage: tax.percentage,
            }),
            note,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdateErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(UpdateErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::LineDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        // Standard Graphql Errors
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::NotAServiceItem => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::UpdatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
