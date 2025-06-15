use super::{DBType, PurchaseOrderRow, PurchaseOrderStatus, RepositoryError, StorageConnection};
use crate::diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort_no_case};
use crate::purchase_order_row::purchase_order::{self};

use crate::{DatetimeFilter, EqualFilter, Pagination, Sort};
use diesel::query_dsl::QueryDsl;
use diesel::{prelude::*, RunQueryDsl};

#[derive(Clone, Default)]
pub struct PurchaseOrderFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub status: Option<EqualFilter<PurchaseOrderStatus>>,
    pub supplier_name_link_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum PurchaseOrderSortField {
    Supplier,
    Number,
    CreatedDatetime,
    Status,
    TargetMonths,
    DeliveryDate,
}

pub type PurchaseOrderSort = Sort<PurchaseOrderSortField>;

pub struct PurchaseOrderRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PurchaseOrderRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PurchaseOrderRepository { connection }
    }

    pub fn count(&self, filter: Option<PurchaseOrderFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PurchaseOrderFilter,
    ) -> Result<Vec<PurchaseOrderRow>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PurchaseOrderFilter>,
        sort: Option<PurchaseOrderSort>,
    ) -> Result<Vec<PurchaseOrderRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                PurchaseOrderSortField::Supplier => {
                    apply_sort_no_case!(query, sort, purchase_order::supplier_name_link_id)
                }
                PurchaseOrderSortField::Number => {
                    apply_sort_no_case!(query, sort, purchase_order::purchase_order_number)
                }
                PurchaseOrderSortField::CreatedDatetime => {
                    apply_sort_no_case!(query, sort, purchase_order::created_datetime)
                }
                PurchaseOrderSortField::Status => {
                    apply_sort_no_case!(query, sort, purchase_order::status)
                }
                PurchaseOrderSortField::TargetMonths => {
                    apply_sort_no_case!(query, sort, purchase_order::target_months)
                }
                PurchaseOrderSortField::DeliveryDate => {
                    apply_sort_no_case!(query, sort, purchase_order::delivered_datetime)
                }
            }
        }

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PurchaseOrderRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedPurchaseOrderQuery = purchase_order::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<PurchaseOrderFilter>) -> BoxedPurchaseOrderQuery {
    let mut query = purchase_order::table.into_boxed();

    if let Some(f) = filter {
        let PurchaseOrderFilter {
            id,
            store_id,
            created_datetime,
            status,
            supplier_name_link_id,
        } = f;
        apply_equal_filter!(query, id, purchase_order::id);
        apply_equal_filter!(query, store_id, purchase_order::store_id);
        apply_date_time_filter!(query, created_datetime, purchase_order::created_datetime);
        apply_equal_filter!(query, status, purchase_order::status);
        apply_equal_filter!(
            query,
            supplier_name_link_id,
            purchase_order::supplier_name_link_id
        );
    }

    query
}

impl PurchaseOrderFilter {
    pub fn new() -> PurchaseOrderFilter {
        PurchaseOrderFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
        self
    }
    pub fn status(mut self, filter: EqualFilter<PurchaseOrderStatus>) -> Self {
        self.status = Some(filter);
        self
    }
    pub fn supplier_name_link_id(mut self, filter: EqualFilter<String>) -> Self {
        self.supplier_name_link_id = Some(filter);
        self
    }
}
