use super::{DBType, RepositoryError, StorageConnection};
use crate::diesel_macros::{apply_equal_filter, apply_sort};
use crate::goods_received_row::{goods_received, GoodsReceivedRow};
use crate::{EqualFilter, Pagination, Sort};
use diesel::query_dsl::QueryDsl;
use diesel::{prelude::*, RunQueryDsl};

#[derive(Clone, Default)]
pub struct GoodsReceivedFilter {
    pub id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum GoodsReceivedSortField {
    CreatedDatetime,
}

pub type GoodsReceivedSort = Sort<GoodsReceivedSortField>;

pub struct GoodsReceivedRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> GoodsReceivedRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        GoodsReceivedRepository { connection }
    }

    pub fn count(&self, filter: Option<GoodsReceivedFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: GoodsReceivedFilter,
    ) -> Result<Vec<GoodsReceivedRow>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<GoodsReceivedFilter>,
        sort: Option<GoodsReceivedSort>,
    ) -> Result<Vec<GoodsReceivedRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                GoodsReceivedSortField::CreatedDatetime => {
                    apply_sort!(query, sort, goods_received::created_datetime)
                }
            }
        } else {
            query = query.order(goods_received::created_datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<GoodsReceivedRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedGoodsReceivedQuery = goods_received::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<GoodsReceivedFilter>) -> BoxedGoodsReceivedQuery {
    let mut query = goods_received::table.into_boxed();

    if let Some(f) = filter {
        let GoodsReceivedFilter { id } = f;
        apply_equal_filter!(query, id, goods_received::id);
    }

    query
}

impl GoodsReceivedFilter {
    pub fn new() -> GoodsReceivedFilter {
        GoodsReceivedFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
}
