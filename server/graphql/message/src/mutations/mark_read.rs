use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{InternalError, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::MessageNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    message::mark_read::{MarkMessageRead, MarkMessageReadError as ServiceError},
};

pub fn mark_message_read(
    ctx: &Context<'_>,
    store_id: &str,
    input: MarkMessageReadInput,
) -> Result<MarkMessageReadResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateMessage,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .message_service
        .mark_message_read(
            &service_context,
            MarkMessageRead {
                message_id: input.message_id,
            },
        ) {
        Ok(message) => Ok(MarkMessageReadResponse::Response(MessageNode::from_domain(
            message,
            store_id.to_string(),
        ))),
        Err(error) => Ok(MarkMessageReadResponse::Error(MarkMessageReadError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct MarkMessageReadInput {
    pub message_id: String,
}

#[derive(SimpleObject)]
pub struct MarkMessageReadError {
    pub error: MarkMessageReadErrorInterface,
}

#[derive(Union)]
pub enum MarkMessageReadResponse {
    Error(MarkMessageReadError),
    Response(MessageNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum MarkMessageReadErrorInterface {
    MessageDoesNotExist(RecordNotFound),
    InternalError(InternalError),
}

fn map_error(error: ServiceError) -> Result<MarkMessageReadErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::MessageDoesNotExist => {
            return Ok(MarkMessageReadErrorInterface::MessageDoesNotExist(
                RecordNotFound,
            ))
        }
        // A store outside the message's audience trying to mark it read is a
        // client-side boundary violation (it should never have the id), not a
        // typed domain error the UI branches on.
        ServiceError::NotARecipient => BadUserInput(formatted_error),
        ServiceError::RecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
