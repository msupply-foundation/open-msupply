use super::{message_row::message, MessageRow, MessageStatus, MessageType, StorageConnection};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    DBType, EqualFilter, Pagination, RepositoryError, Sort,
};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default)]
pub struct MessageFilter {
    pub id: Option<EqualFilter<String>>,
    pub to_store_id: Option<EqualFilter<String>>,
    pub from_store_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<MessageStatus>>,
    pub type_: Option<EqualFilter<MessageType>>,
}

impl MessageFilter {
    pub fn new() -> MessageFilter {
        MessageFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn to_store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.to_store_id = Some(filter);
        self
    }

    pub fn from_store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.from_store_id = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<MessageStatus>) -> Self {
        self.status = Some(filter);
        self
    }

    pub fn type_(mut self, filter: EqualFilter<MessageType>) -> Self {
        self.type_ = Some(filter);
        self
    }
}

#[derive(PartialEq, Debug)]
pub enum MessageSortField {
    CreatedDate,
    Status,
    Type,
}

pub type MessageSort = Sort<MessageSortField>;
type BoxedMessageQuery = IntoBoxed<'static, message::table, DBType>;

pub type Message = MessageRow;

fn create_filtered_query(filter: Option<MessageFilter>) -> BoxedMessageQuery {
    let mut query = message::table.into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, message::id);
        apply_equal_filter!(query, f.to_store_id, message::to_store_id);
        apply_equal_filter!(query, f.from_store_id, message::from_store_id);

        if let Some(status_filter) = f.status {
            if let Some(status_value) = status_filter.equal_to {
                query = query.filter(message::status.eq(status_value));
            }
        }

        if let Some(type_filter) = f.type_ {
            if let Some(type_value) = type_filter.equal_to {
                query = query.filter(message::type_.eq(type_value));
            }
        }
    }
    query
}

pub struct MessageRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MessageRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MessageRepository { connection }
    }

    pub fn count(&self, filter: Option<MessageFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: MessageFilter) -> Result<Vec<Message>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<MessageFilter>,
        sort: Option<MessageSort>,
    ) -> Result<Vec<Message>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                MessageSortField::CreatedDate => {
                    query = match sort.desc {
                        Some(true) => query
                            .order((message::created_date.desc(), message::created_time.desc())),
                        _ => {
                            query.order((message::created_date.asc(), message::created_time.asc()))
                        }
                    }
                }
                MessageSortField::Status => apply_sort_no_case!(query, sort, message::status),
                MessageSortField::Type => apply_sort_no_case!(query, sort, message::type_),
            }
        } else {
            query = query.order((message::created_date.desc(), message::created_time.desc()));
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<Message>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn find_one_by_id(&self, record_id: &str) -> Result<Option<Message>, RepositoryError> {
        Ok(message::table
            .filter(message::id.eq(record_id))
            .first::<Message>(self.connection.lock().connection())
            .optional()?)
    }
}
