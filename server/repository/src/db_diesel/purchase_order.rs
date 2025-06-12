use crate::diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort_no_case};
use crate::purchase_order_row::purchase_order;
use crate::{DBType, PurchaseOrderRow, PurchaseOrderStatus, RepositoryError, StorageConnection};

use crate::{DatetimeFilter, EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct PurchaseOrder {
    purchase_order_row: PurchaseOrderRow,
}

// status, date created, supplier
#[derive(Clone, Default)]
pub struct PurchaseOrderFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub status: Option<EqualFilter<PurchaseOrderStatus>>,
    pub supplier_id: Option<EqualFilter<String>>,
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
                    apply_sort_no_case!(query, sort, purchase_order::delivery_datetime)
                }
            }
        } else {
            query = query.order(purchase_order::id.asc())
        }

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PurchaseOrderRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedPurchaseOrderQuery = purchase_order::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<PurchaseOrderFilter>) -> BoxedPurchaseOrderQuery {
    let mut query = purchase_order::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, purchase_order::id);
        apply_equal_filter!(query, filter.store_id, purchase_order::store_id);
        apply_date_time_filter!(
            query,
            filter.created_datetime,
            purchase_order::created_datetime
        );
        apply_equal_filter!(query, filter.status, purchase_order::status);
        apply_equal_filter!(
            query,
            filter.supplier_id,
            purchase_order::supplier_name_link_id
        );
    }

    query
}

fn to_domain(purchase_order_row: PurchaseOrderRow) -> PurchaseOrder {
    PurchaseOrder { purchase_order_row }
}
