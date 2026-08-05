use super::query::get_message;
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::Utc;
use repository::{
    message::Message,
    message_row::{
        MessageRecipientRow, MessageRecipientRowRepository, MessageRowRepository,
    },
    RepositoryError,
};
use util::uuid::uuid;

#[derive(PartialEq, Debug, Clone)]
pub struct MarkMessageRead {
    pub message_id: String,
}

#[derive(PartialEq, Debug)]
pub enum MarkMessageReadError {
    MessageDoesNotExist,
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

            match recipient_repo
                .find_one_by_group_and_store(&message.group_id, &ctx.store_id)?
            {
                Some(existing) => {
                    if existing.read_datetime.is_none() {
                        recipient_repo.upsert_one(&MessageRecipientRow {
                            read_datetime: Some(now),
                            ..existing
                        })?;
                    }
                    // already read → no-op (idempotent)
                }
                None => {
                    // Acting store isn't yet a recorded recipient (e.g. an
                    // all-stores broadcast where the row set is materialised on
                    // read); record the read against the group.
                    recipient_repo.upsert_one(&MessageRecipientRow {
                        id: uuid(),
                        group_id: message.group_id.clone(),
                        store_id: ctx.store_id.clone(),
                        read_datetime: Some(now),
                    })?;
                }
            }

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
