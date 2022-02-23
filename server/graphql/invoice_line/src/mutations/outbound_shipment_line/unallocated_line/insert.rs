use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        ForeignKey, ForeignKeyError,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::{
    InvoiceLineNode,
};
use service::invoice_line::{
    InsertOutboundShipmentUnallocatedLine as ServiceInput,
    InsertOutboundShipmentUnallocatedLineError as ServiceError,
};
#[derive(InputObject)]
#[graphql(name = "InsertOutboundShipmentUnallocatedLineInput")]
pub struct InsertInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub quantity: u32,
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundShipmentUnallocatedLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    ForeignKeyError(ForeignKeyError),
    UnallocatedLinesOnlyEditableInNewInvoice(UnallocatedLinesOnlyEditableInNewInvoice),
    UnallocatedLineForItemAlreadyExists(UnallocatedLineForItemAlreadyExists),
}

pub struct UnallocatedLineForItemAlreadyExists;
#[Object]
impl UnallocatedLineForItemAlreadyExists {
    pub async fn description(&self) -> &'static str {
        "Unallocated line already exists for this item"
    }
}

pub struct UnallocatedLinesOnlyEditableInNewInvoice;
#[Object]
impl UnallocatedLinesOnlyEditableInNewInvoice {
    pub async fn description(&self) -> &'static str {
        "Can only insert or edit unallocated lines in new invoice"
    }
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentUnallocatedLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertOutboundShipmentUnallocatedLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

impl From<InsertInput> for ServiceInput {
    fn from(
        InsertInput {
            id,
            invoice_id,
            item_id,
            quantity,
        }: InsertInput,
    ) -> Self {
        ServiceInput {
            id,
            invoice_id,
            item_id,
            quantity,
        }
    }
}

pub fn insert(ctx: &Context<'_>, input: InsertInput) -> Result<InsertResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let id = input.id.clone();

    let response = match service_provider
        .outbound_shipment_line
        .insert_outbound_shipment_unallocated_line(&service_context, input.into())
    {
        Ok(invoice_line) => InsertResponse::Response(InvoiceLineNode::from_domain(invoice_line)),
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(&id, error)?,
        }),
    };

    Ok(response)
}

fn map_error(id: &str, error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("Insert unallocated line {}: {:#?}", id, error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(InsertErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::CanOnlyAddLinesToNewOutboundShipment => {
            return Ok(
                InsertErrorInterface::UnallocatedLinesOnlyEditableInNewInvoice(
                    UnallocatedLinesOnlyEditableInNewInvoice {},
                ),
            )
        }
        ServiceError::UnallocatedLineForItemAlreadyExistsInInvoice => {
            return Ok(InsertErrorInterface::UnallocatedLineForItemAlreadyExists(
                UnallocatedLineForItemAlreadyExists {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::LineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::ItemNotFound => BadUserInput(formatted_error),
        ServiceError::NotAStockItem => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
