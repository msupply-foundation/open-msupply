use domain::{Pagination, SimpleStringFilter, Sort};

use crate::{
    diesel_macros::apply_simple_string_filter,
    schema::{
        diesel_schema::{store, store::dsl as store_dsl},
        StoreRow,
    },
    DBType, RepositoryError, StorageConnection,
};

use diesel::{dsl::IntoBoxed, prelude::*};

pub struct StoreRepository<'a> {
    connection: &'a StorageConnection,
}

#[derive(Debug, Clone)]
pub struct StoreFilter {
    pub id: Option<SimpleStringFilter>,
}

impl StoreFilter {
    pub fn new() -> StoreFilter {
        StoreFilter { id: None }
    }

    pub fn id(mut self, filter: SimpleStringFilter) -> Self {
        self.id = Some(filter);
        self
    }
}

pub type StoreSort = Sort<()>;

type BoxedStoreQuery = IntoBoxed<'static, store::table, DBType>;

fn create_filtered_query(filter: Option<StoreFilter>) -> BoxedStoreQuery {
    let mut query = store_dsl::store.into_boxed();

    if let Some(f) = filter {
        apply_simple_string_filter!(query, f.id, store_dsl::id);
    }

    query
}

impl<'a> StoreRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StoreRepository { connection }
    }

    pub fn count(&self, filter: Option<StoreFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(&self, filter: StoreFilter) -> Result<Vec<StoreRow>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StoreFilter>,
        _: Option<StoreSort>,
    ) -> Result<Vec<StoreRow>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StoreRow>(&self.connection.connection)?;

        Ok(result)
    }
}
