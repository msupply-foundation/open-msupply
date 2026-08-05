use super::{StoreNode, UserNode};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::generic_filters::{DatetimeFilterInput, EqualFilterStringInput, StringFilterInput};
use graphql_core::loader::{StoreByIdLoader, UserLoader};
use graphql_core::ContextExt;
use repository::{
    message::{Message, MessageFilter, MessageSort, MessageSortField},
    message_row::{MessageKind, MessageRecipientRowRepository, MessageRow},
    DatetimeFilter, EqualFilter, StringFilter,
};
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "SCREAMING_SNAKE_CASE")]
pub enum MessageKindNode {
    Global,
    ByRecord,
}

impl MessageKindNode {
    pub fn from_domain(kind: &MessageKind) -> Self {
        match kind {
            MessageKind::Global => MessageKindNode::Global,
            MessageKind::ByRecord => MessageKindNode::ByRecord,
        }
    }

    pub fn to_domain(self) -> MessageKind {
        match self {
            MessageKindNode::Global => MessageKind::Global,
            MessageKindNode::ByRecord => MessageKind::ByRecord,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::message::MessageSortField")]
pub enum MessageSortFieldInput {
    SentDatetime,
}

#[derive(InputObject)]
pub struct MessageSortInput {
    key: MessageSortFieldInput,
    desc: Option<bool>,
}

impl MessageSortInput {
    pub fn to_domain(self) -> MessageSort {
        MessageSort {
            key: MessageSortField::from(self.key),
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct MessageFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub body: Option<StringFilterInput>,
    pub sender_store_id: Option<EqualFilterStringInput>,
    pub sent_datetime: Option<DatetimeFilterInput>,
    pub record_id: Option<EqualFilterStringInput>,
    /// Narrow to a message kind. GLOBAL for the global list / dashboard panel.
    pub kind: Option<MessageKindNode>,
    /// Narrow to messages unread for the acting store.
    pub unread_only: Option<bool>,
}

impl MessageFilterInput {
    pub fn to_domain(self) -> MessageFilter {
        let MessageFilterInput {
            id,
            body,
            sender_store_id,
            sent_datetime,
            record_id,
            kind,
            unread_only,
        } = self;

        MessageFilter {
            id: id.map(EqualFilter::from),
            body: body.map(StringFilter::from),
            sender_store_id: sender_store_id.map(EqualFilter::from),
            sent_datetime: sent_datetime.map(DatetimeFilter::from),
            record_id: record_id.map(EqualFilter::from),
            kind: kind.map(|k| EqualFilter::equal_to(k.to_domain())),
            group_id: None,
            visible_to_store_id: None,
            unread_only,
        }
    }
}

/// A message plus the store viewing it — `isRead` and the group are resolved
/// relative to this store.
#[derive(PartialEq, Debug)]
pub struct MessageNode {
    pub message: Message,
    pub requesting_store_id: String,
}

#[derive(SimpleObject)]
pub struct MessageConnector {
    total_count: u32,
    nodes: Vec<MessageNode>,
}

#[Object]
impl MessageNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn kind(&self) -> MessageKindNode {
        MessageKindNode::from_domain(&self.row().kind)
    }

    pub async fn body(&self) -> &str {
        &self.row().body
    }

    pub async fn group_id(&self) -> &str {
        &self.row().group_id
    }

    pub async fn sent_datetime(&self) -> chrono::NaiveDateTime {
        self.row().sent_datetime
    }

    pub async fn record_id(&self) -> &Option<String> {
        &self.row().record_id
    }

    pub async fn record_kind(&self) -> &Option<String> {
        &self.row().record_kind
    }

    pub async fn sender_store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        let result = loader
            .load_one(self.row().sender_store_id.clone())
            .await?
            .map(StoreNode::from_domain);
        Ok(result)
    }

    pub async fn sent_by_user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();
        let result = loader
            .load_one(self.row().sent_by_user_id.clone())
            .await?
            .map(UserNode::from_domain);
        Ok(result)
    }

    /// True when this message is read for the requesting store. The sender's own
    /// message is read from send.
    pub async fn is_read(&self, ctx: &Context<'_>) -> Result<bool> {
        if self.row().sender_store_id == self.requesting_store_id {
            return Ok(true);
        }
        let connection = ctx.get_connection_manager().connection()?;
        let recipient = MessageRecipientRowRepository::new(&connection)
            .find_one_by_group_and_store(&self.row().group_id, &self.requesting_store_id)?;
        Ok(recipient
            .map(|r| r.read_datetime.is_some())
            .unwrap_or(false))
    }

    /// The recipient stores of this message's group.
    pub async fn recipient_store_ids(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
        let connection = ctx.get_connection_manager().connection()?;
        let recipients = MessageRecipientRowRepository::new(&connection)
            .find_many_by_group_id(&self.row().group_id)?;
        Ok(recipients.into_iter().map(|r| r.store_id).collect())
    }

    /// Read receipt (the sender's view): the recipient stores that have NOT yet
    /// read this message. Empty once every recipient has read it. The sender's
    /// own recipient row is read from send, so it never appears here.
    /// See spec messaging/rules.md › read receipts.
    pub async fn unread_recipient_store_ids(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
        let connection = ctx.get_connection_manager().connection()?;
        let recipients = MessageRecipientRowRepository::new(&connection)
            .find_many_by_group_id(&self.row().group_id)?;
        Ok(recipients
            .into_iter()
            .filter(|r| r.read_datetime.is_none())
            .map(|r| r.store_id)
            .collect())
    }

    /// Convenience count behind `unreadRecipientStoreIds` — the badge value.
    pub async fn unread_recipient_count(&self, ctx: &Context<'_>) -> Result<i32> {
        Ok(self.unread_recipient_store_ids(ctx).await?.len() as i32)
    }
}

#[derive(Union)]
pub enum MessagesResponse {
    Response(MessageConnector),
}

impl MessageNode {
    pub fn from_domain(message: Message, requesting_store_id: String) -> MessageNode {
        MessageNode {
            message,
            requesting_store_id,
        }
    }

    pub fn row(&self) -> &MessageRow {
        &self.message.message_row
    }
}

impl MessageConnector {
    pub fn from_domain(messages: ListResult<Message>, requesting_store_id: String) -> MessageConnector {
        MessageConnector {
            total_count: messages.count,
            nodes: messages
                .rows
                .into_iter()
                .map(|m| MessageNode::from_domain(m, requesting_store_id.clone()))
                .collect(),
        }
    }

    pub fn from_vec(messages: Vec<Message>, requesting_store_id: String) -> MessageConnector {
        MessageConnector {
            total_count: usize_to_u32(messages.len()),
            nodes: messages
                .into_iter()
                .map(|m| MessageNode::from_domain(m, requesting_store_id.clone()))
                .collect(),
        }
    }
}
