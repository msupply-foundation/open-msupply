use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::customer_return::update_lines::{
    UpdateCustomerReturnLines as ServiceInput, UpdateCustomerReturnLinesError as ServiceError,
};

use super::insert::CustomerReturnLineInput;

#[derive(InputObject)]
#[graphql(name = "UpdateCustomerReturnLinesInput")]
pub struct UpdateInput {
    pub customer_return_id: String,
    customer_return_lines: Vec<CustomerReturnLineInput>,
}

#[derive(Union)]
#[graphql(name = "UpdateCustomerReturnLinesResponse")]
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
            resource: Resource::MutateCustomerReturn,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .update_customer_return_lines(&service_context, input.to_domain());

    match result {
        Ok(customer_return) => Ok(UpdateResponse::Response(InvoiceNode::from_domain(
            customer_return,
        ))),
        Err(err) => map_error(err),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::NotACustomerReturn
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
            customer_return_id,
            customer_return_lines,
        }: UpdateInput = self;

        ServiceInput {
            customer_return_id,
            customer_return_lines: customer_return_lines
                .into_iter()
                .map(|line| line.to_domain())
                .collect(),
        }
    }
}
