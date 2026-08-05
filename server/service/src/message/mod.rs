use self::{
    insert::{insert_message, InsertMessage, InsertMessageError},
    mark_read::{mark_message_read, MarkMessageRead, MarkMessageReadError},
    query::{get_message, get_messages, get_unread_message_count},
    reply::{reply_message, ReplyMessage, ReplyMessageError},
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{
    message::{Message, MessageFilter, MessageSort},
    PaginationOption,
};

pub mod insert;
pub mod mark_read;
pub mod query;
pub mod reply;
mod validate;

pub trait MessageServiceTrait: Sync + Send {
    fn get_messages(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<MessageFilter>,
        sort: Option<MessageSort>,
    ) -> Result<ListResult<Message>, ListError> {
        get_messages(ctx, pagination, filter, sort)
    }

    fn get_message(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Message, SingleRecordError> {
        get_message(ctx, id)
    }

    /// Count of messages unread for the acting store, over an optional filter
    /// (e.g. kind = GLOBAL for the dashboard panel, or a record id for a tab badge).
    fn get_unread_message_count(
        &self,
        ctx: &ServiceContext,
        filter: Option<MessageFilter>,
    ) -> Result<i64, ListError> {
        get_unread_message_count(ctx, filter)
    }

    fn insert_message(
        &self,
        ctx: &ServiceContext,
        input: InsertMessage,
    ) -> Result<Message, InsertMessageError> {
        insert_message(ctx, input)
    }

    fn reply_message(
        &self,
        ctx: &ServiceContext,
        input: ReplyMessage,
    ) -> Result<Message, ReplyMessageError> {
        reply_message(ctx, input)
    }

    fn mark_message_read(
        &self,
        ctx: &ServiceContext,
        input: MarkMessageRead,
    ) -> Result<Message, MarkMessageReadError> {
        mark_message_read(ctx, input)
    }
}

pub struct MessageService {}
impl MessageServiceTrait for MessageService {}
