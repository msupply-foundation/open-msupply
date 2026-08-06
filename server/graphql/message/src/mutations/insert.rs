use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError, RecordAlreadyExist, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{MessageKindNode, MessageNode};
use service::{
    auth::{Resource, ResourceAccessRequest},
    message::insert::{
        InsertMessage, InsertMessageError as ServiceError, MessageRecipients,
    },
};

pub fn insert_message(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertMessageInput,
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
        .insert_message(&service_context, input.to_domain())
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
pub struct MessageRecipientsInput {
    /// When true, the message reaches every addressable store (broadcast).
    pub all_stores: Option<bool>,
    /// Explicit recipient store ids (used when all_stores is not set).
    pub store_ids: Option<Vec<String>>,
}

impl MessageRecipientsInput {
    fn to_domain(self) -> MessageRecipients {
        if self.all_stores.unwrap_or(false) {
            MessageRecipients::AllStores
        } else {
            MessageRecipients::Stores(self.store_ids.unwrap_or_default())
        }
    }
}

#[derive(InputObject)]
pub struct InsertMessageInput {
    pub id: String,
    pub body: String,
    pub kind: MessageKindNode,
    pub recipients: MessageRecipientsInput,
    /// Required when kind = BY_RECORD (the transfer id); forbidden when GLOBAL.
    pub record_id: Option<String>,
    pub record_kind: Option<String>,
    /// The counterpart record on the recipient's side (spec messaging › related
    /// records) — lets each store open its own record from the message.
    pub linked_record_id: Option<String>,
}

impl InsertMessageInput {
    fn to_domain(self) -> InsertMessage {
        let InsertMessageInput {
            id,
            body,
            kind,
            recipients,
            record_id,
            record_kind,
            linked_record_id,
        } = self;
        InsertMessage {
            id,
            body,
            kind: kind.to_domain(),
            recipients: recipients.to_domain(),
            record_id,
            record_kind,
            linked_record_id,
        }
    }
}

#[derive(SimpleObject)]
pub struct InsertMessageError {
    pub error: InsertMessageErrorInterface,
}

#[derive(Union)]
pub enum InsertMessageResponse {
    Error(InsertMessageError),
    Response(MessageNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertMessageErrorInterface {
    MessageAlreadyExists(RecordAlreadyExist),
    EmptyBody(EmptyBody),
    NoRecipients(NoRecipients),
    MissingRecord(MissingRecord),
    RecordNotAllowed(RecordNotAllowed),
    RecordNotFound(RecordNotFound),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

pub struct EmptyBody;
#[Object]
impl EmptyBody {
    pub async fn description(&self) -> &str {
        "Message body must not be empty"
    }
}

pub struct NoRecipients;
#[Object]
impl NoRecipients {
    pub async fn description(&self) -> &str {
        "A message must have at least one recipient other than the sender"
    }
}

pub struct MissingRecord;
#[Object]
impl MissingRecord {
    pub async fn description(&self) -> &str {
        "A by-record message requires a record"
    }
}

pub struct RecordNotAllowed;
#[Object]
impl RecordNotAllowed {
    pub async fn description(&self) -> &str {
        "A global message must not carry a record"
    }
}

fn map_error(error: ServiceError) -> Result<InsertMessageErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Structured errors
        ServiceError::MessageAlreadyExists => {
            return Ok(InsertMessageErrorInterface::MessageAlreadyExists(
                RecordAlreadyExist,
            ))
        }
        ServiceError::EmptyBody => {
            return Ok(InsertMessageErrorInterface::EmptyBody(EmptyBody))
        }
        ServiceError::NoRecipients => {
            return Ok(InsertMessageErrorInterface::NoRecipients(NoRecipients))
        }
        ServiceError::MissingRecord => {
            return Ok(InsertMessageErrorInterface::MissingRecord(MissingRecord))
        }
        ServiceError::RecordNotAllowed => {
            return Ok(InsertMessageErrorInterface::RecordNotAllowed(
                RecordNotAllowed,
            ))
        }
        // Standard graphql errors
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
