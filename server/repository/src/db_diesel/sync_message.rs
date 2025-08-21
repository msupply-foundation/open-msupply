use super::{sync_message_row::sync_message, DBType, StorageConnection, SyncMessageRow};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort},
    repository_error::RepositoryError,
    SyncMessageRowStatus,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct SyncMessage {
    pub sync_message_row: SyncMessageRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct SyncMessageFilter {
    pub id: Option<EqualFilter<String>>,
    pub to_store_id: Option<EqualFilter<String>>,
    pub from_store_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<SyncMessageRowStatus>>,
}

#[derive(PartialEq, Debug)]
pub enum SyncMessageSortField {
    Id,
    CreatedDatetime,
    Status,
}

pub type SyncMessageSort = Sort<SyncMessageSortField>;

pub struct SyncMessageRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncMessageRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncMessageRepository { connection }
    }

    pub fn count(&self, filter: Option<SyncMessageFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: SyncMessageFilter,
    ) -> Result<Vec<SyncMessageRow>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<SyncMessageFilter>,
        sort: Option<SyncMessageSort>,
    ) -> Result<Vec<SyncMessageRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                SyncMessageSortField::Id => {
                    apply_sort!(query, sort, sync_message::id)
                }
                SyncMessageSortField::CreatedDatetime => {
                    apply_sort!(query, sort, sync_message::created_datetime)
                }
                SyncMessageSortField::Status => {
                    apply_sort!(query, sort, sync_message::status)
                }
            }
        } else {
            query = query.order(sync_message::created_datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<SyncMessageRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedSyncMessageQuery = sync_message::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<SyncMessageFilter>) -> BoxedSyncMessageQuery {
    let mut query = sync_message::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, sync_message::id);
        apply_equal_filter!(query, filter.to_store_id, sync_message::to_store_id);
        apply_equal_filter!(query, filter.from_store_id, sync_message::from_store_id);
        apply_equal_filter!(query, filter.status, sync_message::status);
    }

    query
}

impl SyncMessageFilter {
    pub fn new() -> SyncMessageFilter {
        SyncMessageFilter::default()
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

    pub fn status(mut self, filter: EqualFilter<SyncMessageRowStatus>) -> Self {
        self.status = Some(filter);
        self
    }
}
