use super::{DBType, RepositoryError, StorageConnection};
use crate::diesel_macros::{apply_equal_filter, apply_sort};
use crate::goods_received_row::{goods_received, GoodsReceivedRow};
use crate::{EqualFilter, Pagination, Sort};
use diesel::query_dsl::QueryDsl;
use diesel::{prelude::*, RunQueryDsl};

#[derive(Clone, Default)]
pub struct GoodsReceivedFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub purchase_order_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum GoodsReceivedSortField {
    CreatedDatetime,
    Number,
    Status,
    ReceivedDate,
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
                GoodsReceivedSortField::Number => {
                    apply_sort!(query, sort, goods_received::goods_received_number)
                }
                GoodsReceivedSortField::Status => {
                    apply_sort!(query, sort, goods_received::status)
                }
                GoodsReceivedSortField::ReceivedDate => {
                    apply_sort!(query, sort, goods_received::received_date)
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
        let GoodsReceivedFilter {
            id,
            store_id,
            purchase_order_id,
        } = f;
        apply_equal_filter!(query, id, goods_received::id);
        apply_equal_filter!(query, store_id, goods_received::store_id);
        apply_equal_filter!(query, purchase_order_id, goods_received::purchase_order_id);
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

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn purchase_order_id(mut self, filter: EqualFilter<String>) -> Self {
        self.purchase_order_id = Some(filter);
        self
    }
}
