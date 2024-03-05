use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InboundReturnLineConnector;
use service::auth::{Resource, ResourceAccessRequest};

use service::invoice::inbound_return::{
    ExistingLinesInput as ExistingLinesServiceInput,
    GenerateInboundReturnLinesInput as ServiceInput,
};

#[derive(InputObject, Clone)]
pub struct ExistingLinesInput {
    pub item_id: String,
    pub return_id: String,
}

#[derive(InputObject, Clone)]
pub struct GenerateInboundReturnLinesInput {
    /// The ids of the outbound shipment lines to generate new return lines for
    pub outbound_shipment_line_ids: Vec<String>,
    pub existing_lines_input: Option<ExistingLinesInput>,
}

#[derive(Union)]
pub enum GenerateInboundReturnLinesResponse {
    Response(InboundReturnLineConnector),
}

pub fn generate_inbound_return_lines(
    ctx: &Context<'_>,
    store_id: String,
    input: GenerateInboundReturnLinesInput,
) -> Result<GenerateInboundReturnLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // resource: Resource::MutateInboundReturn, // TODO: later...
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let return_lines = service_provider
        .invoice_service
        .generate_inbound_return_lines(&service_context, &store_id, input.to_domain())
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(GenerateInboundReturnLinesResponse::Response(
        InboundReturnLineConnector::from_domain(return_lines),
    ))
}

impl GenerateInboundReturnLinesInput {
    fn to_domain(self) -> ServiceInput {
        let GenerateInboundReturnLinesInput {
            outbound_shipment_line_ids,
            existing_lines_input,
        } = self;

        ServiceInput {
            outbound_shipment_line_ids,
            existing_lines_input: existing_lines_input.map(|input| ExistingLinesServiceInput {
                item_id: input.item_id,
                return_id: input.return_id,
            }),
        }
    }
}
