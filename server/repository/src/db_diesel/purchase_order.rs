use super::{DBType, RepositoryError, StorageConnection};
use crate::db_diesel::name_row::name;
use crate::diesel_macros::{
    apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter,
};
use crate::purchase_order_row::{
    purchase_order::{self},
    purchase_order_stats::{self},
    PurchaseOrderRow, PurchaseOrderStatsRow, PurchaseOrderStatus,
};

use crate::{name_link, DatetimeFilter, EqualFilter, Pagination, Sort, StringFilter};
use diesel::query_dsl::QueryDsl;
use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
    RunQueryDsl,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct PurchaseOrder {
    pub purchase_order_row: PurchaseOrderRow,
    pub purchase_order_stats_row: Option<PurchaseOrderStatsRow>,
}

#[derive(Clone, Default)]
pub struct PurchaseOrderFilter {
    pub created_datetime: Option<DatetimeFilter>,
    pub confirmed_datetime: Option<DatetimeFilter>,
    pub sent_datetime: Option<DatetimeFilter>,
    pub supplier: Option<StringFilter>,
    pub item_name: Option<StringFilter>,
    pub item_code: Option<StringFilter>,
    pub donor: Option<StringFilter>,
    pub id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<PurchaseOrderStatus>>,
    pub store_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum PurchaseOrderSortField {
    Number,
    CreatedDatetime,
    Status,
    TargetMonths,
}

pub type PurchaseOrderSort = Sort<PurchaseOrderSortField>;

pub struct PurchaseOrderRepository<'a> {
    connection: &'a StorageConnection,
}

type PurchaseOrderJoin = (PurchaseOrderRow, Option<PurchaseOrderStatsRow>);

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
    ) -> Result<Vec<PurchaseOrder>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PurchaseOrderFilter>,
        sort: Option<PurchaseOrderSort>,
    ) -> Result<Vec<PurchaseOrder>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                PurchaseOrderSortField::Number => {
                    apply_sort!(query, sort, purchase_order::purchase_order_number)
                }
                PurchaseOrderSortField::CreatedDatetime => {
                    apply_sort!(query, sort, purchase_order::created_datetime)
                }
                PurchaseOrderSortField::Status => {
                    apply_sort!(query, sort, purchase_order::status)
                }
                PurchaseOrderSortField::TargetMonths => {
                    apply_sort!(query, sort, purchase_order::target_months)
                }
            }
        } else {
            query = query.order(purchase_order::created_datetime.desc())
        }

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PurchaseOrderJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((purchase_order, purchase_order_stats): PurchaseOrderJoin) -> PurchaseOrder {
    PurchaseOrder {
        purchase_order_row: purchase_order,
        purchase_order_stats_row: purchase_order_stats,
    }
}

type BoxedPurchaseOrderQuery =
    IntoBoxed<'static, LeftJoin<purchase_order::table, purchase_order_stats::table>, DBType>;

fn create_filtered_query(filter: Option<PurchaseOrderFilter>) -> BoxedPurchaseOrderQuery {
    let mut query = purchase_order::table
        .left_join(purchase_order_stats::table)
        .into_boxed();

    if let Some(f) = filter {
        let PurchaseOrderFilter {
            id,
            store_id,
            created_datetime,
            status,
            supplier,
            confirmed_datetime,
            sent_datetime,
            item_name,
            item_code,
            donor,
        } = f;
        apply_equal_filter!(query, id, purchase_order::id);
        apply_equal_filter!(query, store_id, purchase_order::store_id);
        apply_date_time_filter!(query, created_datetime, purchase_order::created_datetime);
        apply_equal_filter!(query, status, purchase_order::status);
        if let Some(supplier_string) = supplier {
            let mut sub_query = name_link::table
                .inner_join(name::table)
                .select(name_link::id)
                .into_boxed();
            apply_string_filter!(sub_query, Some(supplier_string), name::name_);

            query = query.filter(purchase_order::supplier_name_link_id.eq_any(sub_query));
        }
        apply_date_time_filter!(
            query,
            confirmed_datetime,
            purchase_order::confirmed_datetime
        );
        apply_date_time_filter!(query, sent_datetime, purchase_order::sent_datetime);
        if let Some(item_name_string) = item_name {
            let mut sub_query = name_link::table
                .inner_join(name::table)
                .select(name_link::id)
                .into_boxed();
            apply_string_filter!(sub_query, Some(item_name_string), name::name_);

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
    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
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
