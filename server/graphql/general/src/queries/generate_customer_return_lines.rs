use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::GeneratedCustomerReturnLineConnector;
use service::auth::{Resource, ResourceAccessRequest};

use service::invoice::customer_return::{
    ExistingLinesInput as ExistingLinesServiceInput,
    GenerateCustomerReturnLinesInput as ServiceInput,
};

#[derive(InputObject, Clone)]
pub struct ExistingLinesInput {
    pub item_id: String,
    pub return_id: String,
}

#[derive(InputObject, Clone)]
pub struct GenerateCustomerReturnLinesInput {
    /// The ids of the outbound shipment lines to generate new return lines for
    pub outbound_shipment_line_ids: Vec<String>,
    pub existing_lines_input: Option<ExistingLinesInput>,
}

#[derive(Union)]
pub enum GenerateCustomerReturnLinesResponse {
    Response(GeneratedCustomerReturnLineConnector),
}

pub fn generate_customer_return_lines(
    ctx: &Context<'_>,
    store_id: String,
    input: GenerateCustomerReturnLinesInput,
) -> Result<GenerateCustomerReturnLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateCustomerReturn,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let return_lines = service_provider
        .invoice_service
        .generate_customer_return_lines(&service_context, &store_id, input.to_domain())
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(GenerateCustomerReturnLinesResponse::Response(
        GeneratedCustomerReturnLineConnector::from_domain(return_lines),
    ))
}

impl GenerateCustomerReturnLinesInput {
    fn to_domain(self) -> ServiceInput {
        let GenerateCustomerReturnLinesInput {
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
