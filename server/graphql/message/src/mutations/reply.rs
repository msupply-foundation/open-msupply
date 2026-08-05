use super::insert::{EmptyBody, InsertMessageError, InsertMessageErrorInterface, InsertMessageResponse};
use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{RecordAlreadyExist, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::MessageNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    message::reply::{ReplyMessage, ReplyMessageError as ServiceError},
};

pub fn reply_message(
    ctx: &Context<'_>,
    store_id: &str,
    input: ReplyMessageInput,
) -> Result<InsertMessageResponse> {
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
        .reply_message(&service_context, input.to_domain())
    {
        Ok(message) => Ok(InsertMessageResponse::Response(MessageNode::from_domain(
            message,
            store_id.to_string(),
        ))),
        Err(error) => Ok(InsertMessageResponse::Error(InsertMessageError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct ReplyMessageInput {
    pub id: String,
    /// The message being replied to. The reply is addressed to its sender.
    pub reply_to_message_id: String,
    pub body: String,
}

impl ReplyMessageInput {
    fn to_domain(self) -> ReplyMessage {
        let ReplyMessageInput {
            id,
            reply_to_message_id,
            body,
        } = self;
        ReplyMessage {
            id,
            reply_to_message_id,
            body,
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertMessageErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::MessageAlreadyExists => {
            return Ok(InsertMessageErrorInterface::MessageAlreadyExists(
                RecordAlreadyExist,
            ))
        }
        ServiceError::EmptyBody => {
            return Ok(InsertMessageErrorInterface::EmptyBody(EmptyBody))
        }
        ServiceError::RepliedToMessageNotFound => {
            return Ok(InsertMessageErrorInterface::RecordNotFound(RecordNotFound))
        }
        // A store replying to its own message is a client mistake, not a typed
        // domain error the UI branches on — surface as a standard error.
        ServiceError::CannotReplyToOwnMessage => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
