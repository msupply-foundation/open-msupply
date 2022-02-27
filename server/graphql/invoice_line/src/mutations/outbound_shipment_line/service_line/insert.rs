use async_graphql::*;

use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError},
    ContextExt,
};
use graphql_types::types::InvoiceLineNode;

use service::invoice_line::outbound_shipment_service_line::{
    InsertOutboundShipmentServiceLine as ServiceInput,
    InsertOutboundShipmentServiceLineError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertInput")]
pub struct InsertInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    name: Option<String>,
    total_before_tax: f64,
    total_after_tax: f64,
    tax: Option<f64>,
    note: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentServiceLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundShipmentServiceLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider
        .invoice_line_service
        .insert_outbound_shipment_service_line(&service_context, store_id, input.to_domain())
    {
        Ok(invoice_line) => InsertResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    CannotEditInvoice(CannotEditInvoice),
    ForeignKeyError(ForeignKeyError),
}

impl InsertInput {
    fn to_domain(self) -> ServiceInput {
        let InsertInput {
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
            tax,
            note,
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(InsertErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotAServiceItem => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
