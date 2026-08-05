use super::{
    query::get_message,
    validate::{check_body_not_empty, check_message_does_not_exist},
};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::Utc;
use repository::{
    message::Message,
    message_row::{
        MessageGroupRow, MessageGroupRowRepository, MessageRecipientRow,
        MessageRecipientRowRepository, MessageRow, MessageRowRepository,
    },
    RepositoryError, StorageConnection,
};
use util::uuid::uuid;

#[derive(PartialEq, Debug, Clone)]
pub struct ReplyMessage {
    pub id: String,
    /// The message being replied to. The reply goes back to its sender.
    pub reply_to_message_id: String,
    pub body: String,
}

#[derive(PartialEq, Debug)]
pub enum ReplyMessageError {
    MessageAlreadyExists,
    EmptyBody,
    RepliedToMessageNotFound,
    CannotReplyToOwnMessage,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub fn reply_message(
    ctx: &ServiceContext,
    input: ReplyMessage,
) -> Result<Message, ReplyMessageError> {
    let message = ctx
        .connection
        .transaction_sync(|connection| {
            let replied_to = validate(&input, &ctx.store_id, connection)?;
            let (group, recipient, message) =
                generate(&ctx.store_id, &ctx.user_id, input, &replied_to);

            // A reply goes to the original sender only (this iteration): a fresh
            // group whose single recipient is that sender. See spec messaging/rules.md › reply.
            MessageGroupRowRepository::new(connection).upsert_one(&group)?;
            MessageRecipientRowRepository::new(connection).upsert_one(&recipient)?;
            MessageRowRepository::new(connection).upsert_one(&message)?;

            get_message(ctx, message.id).map_err(ReplyMessageError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(message)
}

pub fn validate(
    input: &ReplyMessage,
    replier_store_id: &str,
    connection: &StorageConnection,
) -> Result<MessageRow, ReplyMessageError> {
    if !check_message_does_not_exist(&input.id, connection)? {
        return Err(ReplyMessageError::MessageAlreadyExists);
    }
    if !check_body_not_empty(&input.body) {
        return Err(ReplyMessageError::EmptyBody);
    }

    let replied_to = MessageRowRepository::new(connection)
        .find_one_by_id(&input.reply_to_message_id)?
        .ok_or(ReplyMessageError::RepliedToMessageNotFound)?;

    if replied_to.sender_store_id == replier_store_id {
        return Err(ReplyMessageError::CannotReplyToOwnMessage);
    }

    Ok(replied_to)
}

pub fn generate(
    replier_store_id: &str,
    replier_user_id: &str,
    input: ReplyMessage,
    replied_to: &MessageRow,
) -> (MessageGroupRow, MessageRecipientRow, MessageRow) {
    let now = Utc::now().naive_utc();
    let group_id = uuid();

    let group = MessageGroupRow {
        id: group_id.clone(),
        all_stores: false,
    };

    // The single recipient is the store that sent the message being replied to.
    let recipient = MessageRecipientRow {
        id: uuid(),
        group_id: group_id.clone(),
        store_id: replied_to.sender_store_id.clone(),
        read_datetime: None,
    };

    let message = MessageRow {
        id: input.id,
        group_id,
        // A reply inherits the original's scope + record (spec messaging/rules.md › reply).
        kind: replied_to.kind.clone(),
        body: input.body,
        sender_store_id: replier_store_id.to_string(),
        sent_by_user_id: replier_user_id.to_string(),
        sent_datetime: now,
        record_kind: replied_to.record_kind.clone(),
        record_id: replied_to.record_id.clone(),
    };

    (group, recipient, message)
}

impl From<RepositoryError> for ReplyMessageError {
    fn from(error: RepositoryError) -> Self {
        ReplyMessageError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for ReplyMessageError {
    fn from(error: SingleRecordError) -> Self {
        use ReplyMessageError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
