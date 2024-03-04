use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::OutboundReturnLineConnector;
use service::auth::{Resource, ResourceAccessRequest};

use service::invoice::outbound_return::generate_lines::GenerateOutboundReturnLinesInput as ServiceInput;

#[derive(InputObject, Clone)]
/// At least one input is required.
/// Note that if you provide multiple inputs, they will be applied as an AND filter.
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
        .generate_outbound_return_lines(&service_context, &store_id, input.to_domain())
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(GenerateOutboundReturnLinesResponse::Response(
        OutboundReturnLineConnector::from_domain(return_lines),
    ))
}

impl GenerateOutboundReturnLinesInput {
    fn to_domain(self) -> ServiceInput {
        let GenerateOutboundReturnLinesInput {
            stock_line_ids,
            item_id,
            return_id,
        } = self;

        ServiceInput {
            stock_line_ids,
            item_id,
            return_id,
        }
    }
}
