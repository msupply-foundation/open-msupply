use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::OutboundReturnLineConnector;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject, Clone)]
pub struct GenerateOutboundReturnLinesInput {
    pub stock_line_ids: Vec<String>,
    pub item_id: Option<String>,
    pub return_id: Option<String>,
}

#[derive(Union)]
pub enum GenerateOutboundReturnLinesResponse {
    Response(OutboundReturnLineConnector),
}

pub fn generate_outbound_return_lines(
    ctx: &Context<'_>,
    store_id: String,
    input: GenerateOutboundReturnLinesInput,
) -> Result<GenerateOutboundReturnLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // resource: Resource::MutateOutboundReturn, // TODO: later...
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let return_lines = service_provider
        .invoice_service
        .generate_outbound_return_lines(
            &service_context,
            &store_id,
            input.stock_line_ids,
            input.item_id,
            input.return_id,
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(GenerateOutboundReturnLinesResponse::Response(
        OutboundReturnLineConnector::from_domain(return_lines),
    ))
}
