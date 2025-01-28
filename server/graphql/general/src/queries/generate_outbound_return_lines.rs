use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::OutboundReturnLineConnector;
use service::auth::{Resource, ResourceAccessRequest};

use service::invoice::outbound_return::generate_outbound_return_lines::GenerateOutboundReturnLinesInput as ServiceInput;

#[derive(InputObject, Clone)]
/// At least one input is required.
pub struct GenerateOutboundReturnLinesInput {
    /// The stock line ids to generate new return lines for
    pub stock_line_ids: Vec<String>,
    /// Generate new return lines for all the available stock lines of a specific item
    pub item_id: Option<String>,
    /// Include existing return lines in the response. Only has an effect when either `stock_line_ids` or `item_id` is set.
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
            resource: Resource::MutateOutboundReturn,
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
