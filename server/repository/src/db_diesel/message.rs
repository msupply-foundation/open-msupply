use super::{
    message_row::{message, message_recipient, MessageKind, MessageRow},
    StorageConnection,
};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter},
    DatetimeFilter, StringFilter,
};

use crate::{repository_error::RepositoryError, DBType, EqualFilter, Pagination, Sort};
use diesel::prelude::*;

#[derive(PartialEq, Debug, Clone)]
pub struct Message {
    pub message_row: MessageRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct MessageFilter {
    pub id: Option<EqualFilter<String>>,
    pub kind: Option<EqualFilter<MessageKind>>,
    pub body: Option<StringFilter>,
    pub sender_store_id: Option<EqualFilter<String>>,
    pub sent_datetime: Option<DatetimeFilter>,
    pub group_id: Option<EqualFilter<String>>,
    pub record_id: Option<EqualFilter<String>>,
    /// Scope to messages the given store can see: sent by it, or where it is a
    /// recipient. This is the store-scope boundary — see spec messaging/rules.md.
    pub visible_to_store_id: Option<String>,
    /// Narrow to messages unread for `visible_to_store_id` (recipient row with a
    /// NULL read_datetime). Requires `visible_to_store_id` to be meaningful.
    pub unread_only: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum MessageSortField {
    SentDatetime,
}

pub type MessageSort = Sort<MessageSortField>;

pub struct MessageRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MessageRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MessageRepository { connection }
    }

    pub fn count(&self, filter: Option<MessageFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: MessageFilter) -> Result<Vec<Message>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<MessageFilter>,
        sort: Option<MessageSort>,
    ) -> Result<Vec<Message>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                MessageSortField::SentDatetime => {
                    apply_sort!(query, sort, message::sent_datetime)
                }
            }
        } else {
            // Newest first by default — the order every surface uses.
            query = query.order(message::sent_datetime.desc());
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<MessageRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(filter: Option<MessageFilter>) -> BoxedMessageQuery {
        let mut query = message::table.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, message::id);
            apply_equal_filter!(query, filter.kind, message::kind);
            apply_string_filter!(query, filter.body, message::body);
            apply_equal_filter!(query, filter.sender_store_id, message::sender_store_id);
            apply_equal_filter!(query, filter.group_id, message::group_id);
            apply_equal_filter!(query, filter.record_id, message::record_id);
            apply_date_time_filter!(query, filter.sent_datetime, message::sent_datetime);

            if let Some(store_id) = filter.visible_to_store_id {
                let recipient_groups = message_recipient::table
                    .filter(message_recipient::store_id.eq(store_id.clone()))
                    .select(message_recipient::group_id);

                query = query.filter(
                    message::sender_store_id
                        .eq(store_id.clone())
                        .or(message::group_id.eq_any(recipient_groups)),
                );

                if filter.unread_only.unwrap_or(false) {
                    // Unread = a recipient row for this store with no read_datetime.
                    // (The sender's own message is read for the sender, so it is
                    // excluded here regardless.)
                    let unread_groups = message_recipient::table
                        .filter(message_recipient::store_id.eq(store_id.clone()))
                        .filter(message_recipient::read_datetime.is_null())
                        .select(message_recipient::group_id);
                    query = query.filter(
                        message::group_id
                            .eq_any(unread_groups)
                            .and(message::sender_store_id.ne(store_id)),
                    );
                }
            }
        }

        query
    }
}

type BoxedMessageQuery = message::BoxedQuery<'static, DBType>;

fn to_domain(message_row: MessageRow) -> Message {
    Message { message_row }
}

impl MessageFilter {
    pub fn new() -> MessageFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn kind(mut self, filter: EqualFilter<MessageKind>) -> Self {
        self.kind = Some(filter);
        self
    }

    pub fn body(mut self, filter: StringFilter) -> Self {
        self.body = Some(filter);
        self
    }

    pub fn sender_store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.sender_store_id = Some(filter);
        self
    }

    pub fn sent_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.sent_datetime = Some(filter);
        self
    }

    pub fn group_id(mut self, filter: EqualFilter<String>) -> Self {
        self.group_id = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }

    pub fn visible_to_store_id(mut self, store_id: String) -> Self {
        self.visible_to_store_id = Some(store_id);
        self
    }

    pub fn unread_only(mut self, unread_only: bool) -> Self {
        self.unread_only = Some(unread_only);
        self
    }
}
