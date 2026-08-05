use super::query::get_message;
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::Utc;
use repository::{
    message::Message,
    message_row::{MessageRecipientRow, MessageRecipientRowRepository, MessageRowRepository},
    RepositoryError,
};

#[derive(PartialEq, Debug, Clone)]
pub struct MarkMessageRead {
    pub message_id: String,
}

#[derive(PartialEq, Debug)]
pub enum MarkMessageReadError {
    MessageDoesNotExist,
    /// The acting store is not a recipient of this message's group, so it has no
    /// read state to set. Guards the write path with the same store-scope
    /// boundary the read path enforces (spec messaging/rules.md › store scope).
    NotARecipient,
    RecordNotFound,
    DatabaseError(RepositoryError),
}

/// Mark a message read for the acting store. Idempotent — marking an
/// already-read message re-returns it with no change.
pub fn mark_message_read(
    ctx: &ServiceContext,
    input: MarkMessageRead,
) -> Result<Message, MarkMessageReadError> {
    let message = ctx
        .connection
        .transaction_sync(|connection| {
            let message = MessageRowRepository::new(connection)
                .find_one_by_id(&input.message_id)?
                .ok_or(MarkMessageReadError::MessageDoesNotExist)?;

            let recipient_repo = MessageRecipientRowRepository::new(connection);
            let now = Utc::now().naive_utc();

            // The acting store must already be a recipient of the message's
            // group — a store can only mark read a message it can see, which is
            // one it received (or sent). No recipient row → not in the audience,
            // reject rather than silently creating read state.
            let existing = recipient_repo
                .find_one_by_group_and_store(&message.group_id, &ctx.store_id)?
                .ok_or(MarkMessageReadError::NotARecipient)?;

            if existing.read_datetime.is_none() {
                recipient_repo.upsert_one(&MessageRecipientRow {
                    read_datetime: Some(now),
                    ..existing
                })?;
            }
            // already read → no-op (idempotent)

            get_message(ctx, input.message_id).map_err(MarkMessageReadError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(message)
}

impl From<RepositoryError> for MarkMessageReadError {
    fn from(error: RepositoryError) -> Self {
        MarkMessageReadError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for MarkMessageReadError {
    fn from(error: SingleRecordError) -> Self {
        use MarkMessageReadError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => RecordNotFound,
        }
    }
}
