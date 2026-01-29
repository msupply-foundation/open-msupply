use super::{name_row::name, store_row::store, NameRow, StorageConnection, StoreRow};

use crate::{
    diesel_macros::{
        apply_equal_filter, apply_sort_no_case, apply_string_filter, apply_string_or_filter,
    },
    DBType, EqualFilter, Pagination, RepositoryError, Sort, StringFilter,
};

use diesel::{dsl::IntoBoxed, prelude::*};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS, PartialEq, Clone)]
pub struct Store {
    pub store_row: StoreRow,
    pub name_row: NameRow,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct StoreFilter {
    pub id: Option<EqualFilter<String>>,
    pub code: Option<StringFilter>,
    pub name_id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub name_code: Option<StringFilter>,
    pub site_id: Option<EqualFilter<i32>>,
    pub code_or_name: Option<StringFilter>,
}

#[derive(PartialEq, Debug)]
pub enum StoreSortField {
    Code,
    Name,
    NameCode,
}

pub type StoreSort = Sort<StoreSortField>;

pub type StoreJoin = (StoreRow, NameRow);

impl StoreFilter {
    pub fn new() -> StoreFilter {
        StoreFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.name_id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn name_code(mut self, filter: StringFilter) -> Self {
        self.name_code = Some(filter);
        self
    }

    pub fn site_id(mut self, filter: EqualFilter<i32>) -> Self {
        self.site_id = Some(filter);
        self
    }

    pub fn code_or_name(mut self, filter: StringFilter) -> Self {
        self.code_or_name = Some(filter);
        self
    }
}

pub struct StoreRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StoreRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StoreRepository { connection }
    }

    pub fn count(&self, filter: Option<StoreFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(&self, filter: StoreFilter) -> Result<Option<Store>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(&self, filter: StoreFilter) -> Result<Vec<Store>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StoreFilter>,
        sort: Option<StoreSort>,
    ) -> Result<Vec<Store>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                StoreSortField::Code => {
                    apply_sort_no_case!(query, sort, store::code);
                }
                StoreSortField::Name => {
                    apply_sort_no_case!(query, sort, name::name_);
                }
                StoreSortField::NameCode => {
                    apply_sort_no_case!(query, sort, name::code);
                }
            }
        } else {
            query = query.order(store::id.asc())
        }
        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StoreJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    store::table.inner_join(name::table)
}

type BoxedStoreQuery = IntoBoxed<'static, query, DBType>;

fn create_filtered_query(filter: Option<StoreFilter>) -> BoxedStoreQuery {
    let mut query = query().into_boxed();

    if let Some(f) = filter {
        let StoreFilter {
            id,
            code,
            name_id,
            name,
            name_code,
            site_id,
            code_or_name,
        } = f;

        // or filter need to be applied before and filters
        if code_or_name.is_some() {
            apply_string_filter!(query, code_or_name.clone(), store::code);
            apply_string_or_filter!(query, code_or_name, name::name_);
        }

        apply_equal_filter!(query, id, store::id);
        apply_string_filter!(query, code, store::code);
        apply_equal_filter!(query, name_id, store::name_id);
        apply_string_filter!(query, name, name::name_);
        apply_string_filter!(query, name_code, name::code);
        apply_equal_filter!(query, site_id, store::site_id);
    }

    query
}

fn to_domain((store_row, name_row): StoreJoin) -> Store {
    Store {
        store_row,
        name_row,
    }
}
