use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::invoice::inbound_return::update::{
    UpdateInboundReturn as ServiceInput, UpdateInboundReturnError as ServiceError,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    invoice::inbound_return::update::UpdateInboundReturnStatus,
};

#[derive(InputObject)]
#[graphql(name = "UpdateInboundReturnInput")]
pub struct UpdateInput {
    pub id: String,
    // supplier_id: String,
    status: Option<UpdateInboundReturnStatusInput>,
    on_hold: Option<bool>,
    comment: Option<String>,
    colour: Option<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateInboundReturnStatusInput {
    Delivered,
    Verified,
}

#[derive(Union)]
#[graphql(name = "UpdateInboundReturnResponse")]
pub enum UpdateResponse {
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // resource: Resource::MutateInboundReturn, // TODO
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .update_inbound_return(&service_context, input.to_domain());

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
        ServiceError::InvoiceDoesNotExist
        | ServiceError::NotAnInboundReturn
        | ServiceError::NotThisStoreInvoice
        | ServiceError::CannotReverseInvoiceStatus
        | ServiceError::ReturnIsNotEditable
        | ServiceError::CannotChangeStatusOfInvoiceOnHold => BadUserInput(formatted_error),

        ServiceError::UpdatedInvoiceDoesNotExist | ServiceError::DatabaseError(_) => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            comment,
            status,
            on_hold,
            colour,
        }: UpdateInput = self;

        ServiceInput {
            id,
            status: status.map(|status| status.to_domain()),
            comment,
            on_hold,
            colour,
        }
    }
}

impl UpdateInboundReturnStatusInput {
    pub fn to_domain(&self) -> UpdateInboundReturnStatus {
        use UpdateInboundReturnStatus::*;
        match self {
            UpdateInboundReturnStatusInput::Delivered => Delivered,
            UpdateInboundReturnStatusInput::Verified => Verified,
        }
    }
}
