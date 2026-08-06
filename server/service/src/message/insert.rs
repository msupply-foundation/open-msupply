use super::{
    query::get_message,
    validate::{check_body_not_empty, check_message_does_not_exist},
};
use crate::{service_provider::ServiceContext, SingleRecordError};
use chrono::Utc;
use repository::{
    message::Message,
    message_row::{
        MessageGroupRow, MessageGroupRowRepository, MessageKind, MessageRecipientRow,
        MessageRecipientRowRepository, MessageRow, MessageRowRepository,
    },
    RepositoryError, StorageConnection, StoreFilter, StoreRepository,
};
use util::uuid::uuid;

#[derive(PartialEq, Debug, Clone)]
pub enum MessageRecipients {
    /// The message reaches every addressable store (broadcast).
    AllStores,
    /// The message reaches exactly these stores.
    Stores(Vec<String>),
}

#[derive(PartialEq, Debug, Clone)]
pub struct InsertMessage {
    pub id: String,
    pub body: String,
    pub kind: MessageKind,
    pub recipients: MessageRecipients,
    /// The transfer id a by-record message is about (required when kind = BY_RECORD).
    pub record_id: Option<String>,
    pub record_kind: Option<String>,
    /// The counterpart record on the recipient's side (spec messaging › related
    /// records) — the sender supplies it so each store can open its own record.
    pub linked_record_id: Option<String>,
}

#[derive(PartialEq, Debug)]
pub enum InsertMessageError {
    MessageAlreadyExists,
    EmptyBody,
    NoRecipients,
    MissingRecord,
    RecordNotAllowed,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub fn insert_message(
    ctx: &ServiceContext,
    input: InsertMessage,
) -> Result<Message, InsertMessageError> {
    let message = ctx
        .connection
        .transaction_sync(|connection| {
            let recipient_store_ids = validate(&input, &ctx.store_id, connection)?;
            let (group, recipients, message) =
                generate(&ctx.store_id, &ctx.user_id, input, recipient_store_ids);

            MessageGroupRowRepository::new(connection).upsert_one(&group)?;
            let recipient_repo = MessageRecipientRowRepository::new(connection);
            for recipient in &recipients {
                recipient_repo.upsert_one(recipient)?;
            }
            MessageRowRepository::new(connection).upsert_one(&message)?;

            get_message(ctx, message.id).map_err(InsertMessageError::from)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(message)
}

/// Returns the resolved recipient store ids (excluding the sender), so `generate`
/// need not re-resolve "all stores".
pub fn validate(
    input: &InsertMessage,
    sender_store_id: &str,
    connection: &StorageConnection,
) -> Result<Vec<String>, InsertMessageError> {
    if !check_message_does_not_exist(&input.id, connection)? {
        return Err(InsertMessageError::MessageAlreadyExists);
    }
    if !check_body_not_empty(&input.body) {
        return Err(InsertMessageError::EmptyBody);
    }
    match input.kind {
        MessageKind::ByRecord => {
            if input.record_id.as_deref().unwrap_or("").is_empty() {
                return Err(InsertMessageError::MissingRecord);
            }
        }
        MessageKind::Global => {
            if input.record_id.is_some() {
                return Err(InsertMessageError::RecordNotAllowed);
            }
        }
    }

    let recipient_store_ids = resolve_recipients(&input.recipients, sender_store_id, connection)?;
    if recipient_store_ids.is_empty() {
        return Err(InsertMessageError::NoRecipients);
    }

    Ok(recipient_store_ids)
}

/// Resolve the recipient set to concrete store ids, always excluding the sender
/// (the sender is added to the group separately, pre-read).
fn resolve_recipients(
    recipients: &MessageRecipients,
    sender_store_id: &str,
    connection: &StorageConnection,
) -> Result<Vec<String>, RepositoryError> {
    let ids = match recipients {
        MessageRecipients::AllStores => StoreRepository::new(connection)
            .query_by_filter(StoreFilter::new())?
            .into_iter()
            .map(|store| store.store_row.id)
            .collect(),
        MessageRecipients::Stores(ids) => ids.clone(),
    };
    Ok(ids
        .into_iter()
        .filter(|id| id != sender_store_id)
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect())
}

pub fn generate(
    sender_store_id: &str,
    sender_user_id: &str,
    input: InsertMessage,
    recipient_store_ids: Vec<String>,
) -> (MessageGroupRow, Vec<MessageRecipientRow>, MessageRow) {
    let now = Utc::now().naive_utc();
    let group_id = uuid();

    let group = MessageGroupRow {
        id: group_id.clone(),
        all_stores: input.recipients == MessageRecipients::AllStores,
    };

    let mut recipients: Vec<MessageRecipientRow> = recipient_store_ids
        .into_iter()
        .map(|store_id| MessageRecipientRow {
            id: uuid(),
            group_id: group_id.clone(),
            store_id,
            read_datetime: None,
        })
        .collect();

    // The sender is a member of its own group, and its own message is read for
    // it from send (spec messaging/rules.md › read state).
    recipients.push(MessageRecipientRow {
        id: uuid(),
        group_id: group_id.clone(),
        store_id: sender_store_id.to_string(),
        read_datetime: Some(now),
    });

    let message = MessageRow {
        id: input.id,
        group_id,
        kind: input.kind,
        body: input.body,
        sender_store_id: sender_store_id.to_string(),
        sent_by_user_id: sender_user_id.to_string(),
        sent_datetime: now,
        record_kind: input.record_kind,
        record_id: input.record_id,
        linked_record_id: input.linked_record_id,
    };

    (group, recipients, message)
}

impl From<RepositoryError> for InsertMessageError {
    fn from(error: RepositoryError) -> Self {
        InsertMessageError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertMessageError {
    fn from(error: SingleRecordError) -> Self {
        use InsertMessageError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
