use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceLineNode;
use repository::InvoiceLine;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::inbound_shipment_from_internal_order_lines::{
    InsertFromInternalOrderLine as ServiceInput, InsertFromInternalOrderLineError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "InsertInboundShipmentLineFromInternalOrderLineInput")]
pub struct InsertFromInternalOrderLine {
    pub invoice_id: String,
    pub requisition_line_id: String,
}

#[derive(Union)]
pub enum InsertFromInternalOrderResponse {
    Response(InvoiceLineNode),
}

pub fn insert_from_internal_order_line(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertFromInternalOrderLine,
) -> Result<InsertFromInternalOrderResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;
    let result = service_provider
        .invoice_line_service
        .insert_from_internal_order_line(&service_context, input.to_domain());

    map_response(result)
}

pub fn map_response(
    from: Result<InvoiceLine, ServiceError>,
) -> Result<InsertFromInternalOrderResponse> {
    let result = match from {
        Ok(invoice) => {
            InsertFromInternalOrderResponse::Response(InvoiceLineNode::from_domain(invoice))
        }
        Err(error) => return map_error(error),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<InsertFromInternalOrderResponse> {
    use ServiceError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        InvoiceDoesNotExist
        | NotThisStoreInvoice
        | CannotEditFinalised
        | NotAnInboundShipment
        | RequisitionLineDoesNotExist
        | RequisitionNotLinkedToInvoice
        | ItemDoesNotExist => StandardGraphqlError::BadUserInput(formatted_error),
        NewlyCreatedLineDoesNotExist | DatabaseError(_) => {
            StandardGraphqlError::InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

impl InsertFromInternalOrderLine {
    pub fn to_domain(self) -> ServiceInput {
        let InsertFromInternalOrderLine {
            invoice_id,
            requisition_line_id,
        } = self;

        ServiceInput {
            invoice_id,
            requisition_line_id,
        }
    }
}
