use crate::{PurchaseOrderRow, RepositoryError, StorageConnection};

use crate::{EqualFilter, Pagination, Sort};

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
    // TODO add  pub status: Option<EqualFilter<EncounterStatus>>,
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
    Lines,
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
                    apply_sort_no_case!(query, sort, purchase_order::supplier_id)
                }
                PurchaseOrderSortField::Number => {
                    apply_sort_no_case!(query, sort, purchase_order::reason)
                }
            }
        }

        //         Supplier,
        // Number,
        // CreatedDatetime,
        // Status,
        // TargetMonths,
        // DeliveryDate,
        // Lines,

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
        apply_equal_filter!(query, filter.r#type, purchase_order::type_);
        if let Some(value) = filter.is_active {
            query = query.filter(purchase_order::is_active.eq(value));
        }
    }

    query
}

fn to_domain(purchase_order_row: PurchaseOrderRow) -> PurchaseOrder {
    PurchaseOrder { purchase_order_row }
}
