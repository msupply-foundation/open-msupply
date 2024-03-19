use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::invoice::outbound_return::update::{
    UpdateOutboundReturn as ServiceInput, UpdateOutboundReturnError as ServiceError,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::outbound_return::update::UpdateOutboundReturnStatus,
};

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundReturnInput")]
pub struct UpdateInput {
    pub outbound_return_id: String,
    // supplier_id: String,
    status: Option<UpdateOutboundReturnStatusInput>,
    comment: Option<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateOutboundReturnStatusInput {
    Picked,
    Shipped,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundReturnResponse")]
pub enum UpdateResponse {
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundReturn,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .update_outbound_return(&service_context, input.to_domain());

    match result {
        Ok(outbound_return) => Ok(UpdateResponse::Response(InvoiceNode::from_domain(
            outbound_return,
        ))),
        Err(err) => map_error(err),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::NotAnOutboundReturn
        | ServiceError::ReturnDoesNotBelongToCurrentStore
        | ServiceError::ReturnIsNotEditable
        | ServiceError::CannotReverseInvoiceStatus
        | ServiceError::CannotChangeStatusOfInvoiceOnHold
        | ServiceError::ReturnDoesNotExist => BadUserInput(formatted_error),

        ServiceError::InvoiceLineHasNoStockLine(_)
        | ServiceError::UpdatedReturnDoesNotExist
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            outbound_return_id,
            comment,
            status,
        }: UpdateInput = self;

        ServiceInput {
            outbound_return_id,
            comment,
            status: status.map(|status| status.to_domain()),
        }
    }
}

impl UpdateOutboundReturnStatusInput {
    pub fn to_domain(&self) -> UpdateOutboundReturnStatus {
        use UpdateOutboundReturnStatus::*;
        match self {
            UpdateOutboundReturnStatusInput::Picked => Picked,
            UpdateOutboundReturnStatusInput::Shipped => Shipped,
        }
    }
}
