use super::{DBType, PurchaseOrderRow, PurchaseOrderStatus, RepositoryError, StorageConnection};
use crate::db_diesel::name_row::name;
use crate::diesel_macros::{
    apply_date_filter, apply_equal_filter, apply_sort, apply_sort_no_case, apply_string_filter,
};
use crate::purchase_order_row::purchase_order::{self};

use crate::{name_link, DateFilter, EqualFilter, Pagination, Sort, StringFilter};
use diesel::query_dsl::QueryDsl;
use diesel::{prelude::*, RunQueryDsl};

#[derive(Clone, Default)]
pub struct PurchaseOrderFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub created_date: Option<DateFilter>,
    pub status: Option<EqualFilter<PurchaseOrderStatus>>,
    pub supplier: Option<StringFilter>,
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
                    apply_sort!(query, sort, purchase_order::purchase_order_number)
                }
                PurchaseOrderSortField::CreatedDatetime => {
                    apply_sort!(query, sort, purchase_order::created_date)
                }
                PurchaseOrderSortField::Status => {
                    apply_sort!(query, sort, purchase_order::status)
                }
                PurchaseOrderSortField::TargetMonths => {
                    apply_sort!(query, sort, purchase_order::target_months)
                }
                PurchaseOrderSortField::DeliveryDate => {
                    apply_sort!(query, sort, purchase_order::received_at_port_date)
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
            created_date,
            status,
            supplier,
        } = f;
        apply_equal_filter!(query, id, purchase_order::id);
        apply_equal_filter!(query, store_id, purchase_order::store_id);
        apply_date_filter!(query, created_date, purchase_order::created_date);
        apply_equal_filter!(query, status, purchase_order::status);
        if let Some(supplier_string) = supplier {
            let mut sub_query = name_link::table
                .inner_join(name::table)
                .select(name_link::id.nullable())
                .into_boxed();
            apply_string_filter!(sub_query, Some(supplier_string), name::name_);

            query = query.filter(purchase_order::supplier_name_link_id.eq_any(sub_query));
        }
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
    pub fn created_date(mut self, filter: DateFilter) -> Self {
        self.created_date = Some(filter);
        self
    }
    pub fn status(mut self, filter: EqualFilter<PurchaseOrderStatus>) -> Self {
        self.status = Some(filter);
        self
    }
    pub fn supplier(mut self, filter: StringFilter) -> Self {
        self.supplier = Some(filter);
        self
    }
}
