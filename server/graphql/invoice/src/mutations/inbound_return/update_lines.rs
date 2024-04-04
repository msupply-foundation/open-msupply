use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::inbound_return::update_lines::{
    UpdateInboundReturnLines as ServiceInput, UpdateInboundReturnLinesError as ServiceError,
};

use super::insert::InboundReturnLineInput;

#[derive(InputObject)]
#[graphql(name = "UpdateInboundReturnLinesInput")]
pub struct UpdateInput {
    pub inbound_return_id: String,
    inbound_return_lines: Vec<InboundReturnLineInput>,
}

#[derive(Union)]
#[graphql(name = "UpdateInboundReturnLinesResponse")]
pub enum UpdateResponse {
    Response(InvoiceNode),
}

pub fn update_lines(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateInput,
) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundReturn,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .update_inbound_return_lines(&service_context, input.to_domain());

    match result {
        Ok(inbound_return) => Ok(UpdateResponse::Response(InvoiceNode::from_domain(
            inbound_return,
        ))),
        Err(err) => map_error(err),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::NotAnInboundReturn
        | ServiceError::ReturnDoesNotBelongToCurrentStore
        | ServiceError::ReturnIsNotEditable
        | ServiceError::ReturnDoesNotExist => BadUserInput(formatted_error),
        ServiceError::LineInsertError { .. }
        | ServiceError::LineUpdateError { .. }
        | ServiceError::LineDeleteError { .. }
        | ServiceError::LineReturnReasonUpdateError { .. }
        | ServiceError::UpdatedReturnDoesNotExist
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            inbound_return_id,
            inbound_return_lines,
        }: UpdateInput = self;

        ServiceInput {
            inbound_return_id,
            inbound_return_lines: inbound_return_lines
                .into_iter()
                .map(|line| line.to_domain())
                .collect(),
        }
    }
}
