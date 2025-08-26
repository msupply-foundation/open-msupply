use super::{
    name_row::name, store_row::store, sync_message_row::sync_message, DBType, StorageConnection,
    SyncMessageRow,
};
use crate::diesel_macros::apply_string_filter;
use diesel::{
    dsl::{sql, InnerJoin, IntoBoxed},
    prelude::*,
};

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
    // pub to_store_name: Option<EqualFilter<String>>,
    pub from_store_id: Option<EqualFilter<String>>,
    // pub from_store_name: Option<EqualFilter<String>>,
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

type BoxedInvoiceQuery = IntoBoxed<
    'static,
    InnerJoin<InnerJoin<sync_message::table, store::table>, name::table>,
    DBType,
>;

fn create_filtered_query(filter: Option<SyncMessageFilter>) -> BoxedSyncMessageQuery {
    let mut query = sync_message::table.into_boxed();

    // Attempt using raw SQL;
    // let mut query = r#"
    //     SELECT *
    //     FROM sync_message
    //     INNER JOIN store AS to_store ON sync_message.to_store_id = to_store.id
    //     INNER JOIN name AS to_name ON to_store.name_link_id = to_name.name_id
    //     INNER JOIN store AS from_store ON sync_message.from_store_id = from_store.id
    //     INNER JOIN name AS from_name ON from_store.name_link_id = from_name.name_id
    // "#;

    // Attempt using (possibly hallucinated) .alias() function
    // let mut query = sync_message::table
    //     .inner_join(
    //         store::table
    //             .on(sync_message::to_store_id.eq(store::id.nullable()))
    //             .inner_join(name::table.on(store::name_link_id.eq(name::id))),
    //     )
    //     .inner_join(
    //         store::table
    //             .alias("from_store")
    //             .on(sql("sync_message.from_store_id = from_store.id"))
    //             .inner_join(
    //                 name::table
    //                     .alias("from_name")
    //                     .on(sql("from_store.name_id = from_name.id")),
    //             ),
    //     )
    //     .into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, sync_message::id);
        apply_equal_filter!(query, filter.to_store_id, sync_message::to_store_id);
        // apply_string_filter!(query, filter.to_store_name, name::name_);
        apply_equal_filter!(query, filter.from_store_id, sync_message::from_store_id);
        // apply_string_filter!(query, filter.from_store_name, name::name_);
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
