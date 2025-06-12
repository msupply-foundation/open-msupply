use super::{
    item_link_row::item_link, item_row::item, purchase_order_line_row::purchase_order_line,
    requisition_line_row::requisition_line, DBType, RepositoryError, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    EqualFilter, ItemLinkRow, ItemRow, Pagination, PurchaseOrderLineRow, RequisitionLineRow, Sort,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct PurchaseOrderLine {
    pub purchase_order_line_row: PurchaseOrderLineRow,
    pub requisition_line_row: Option<RequisitionLineRow>,
    pub item_row: ItemRow,
}
#[derive(Clone, Default)]
pub struct PurchaseOrderLineFilter {
    pub purchase_order_id: Option<EqualFilter<String>>,
}

pub enum PurchaseOrderLineSortField {
    ItemName,
}

pub type PurchaseOrderLineSort = Sort<PurchaseOrderLineSortField>;

pub struct PurchaseOrderLineRepository<'a> {
    connection: &'a StorageConnection,
}

type PurchaseOrderLineJoin = (
    PurchaseOrderLineRow,
    (ItemLinkRow, ItemRow),
    Option<RequisitionLineRow>,
);

impl<'a> PurchaseOrderLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PurchaseOrderLineRepository { connection }
    }

    pub fn count(&self, filter: Option<PurchaseOrderLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PurchaseOrderLineFilter,
    ) -> Result<Vec<PurchaseOrderLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: PurchaseOrderLineFilter,
    ) -> Result<Option<PurchaseOrderLine>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PurchaseOrderLineFilter>,
        sort: Option<PurchaseOrderLineSort>,
    ) -> Result<Vec<PurchaseOrderLine>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                PurchaseOrderLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name);
                }
            }
        } else {
            query = query.order_by(item::name.asc());
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PurchaseOrderLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(
    (purchase_order_line_row, (_, item_row), requisition_line_row): PurchaseOrderLineJoin,
) -> PurchaseOrderLine {
    PurchaseOrderLine {
        purchase_order_line_row,
        requisition_line_row,
        item_row,
    }
}
type BoxedPurchaseOrderLineQuery = IntoBoxed<
    'static,
    LeftJoin<
        InnerJoin<purchase_order_line::table, InnerJoin<item_link::table, item::table>>,
        requisition_line::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<PurchaseOrderLineFilter>) -> BoxedPurchaseOrderLineQuery {
    let mut query = purchase_order_line::table.into_boxed();

    if let Some(f) = filter {
        let PurchaseOrderLineFilter { purchase_order_id } = f;

        apply_equal_filter!(
            query,
            purchase_order_id,
            purchase_order_line::purchase_order_id
        );
    }
    query
}

impl PurchaseOrderLineFilter {
    pub fn new() -> PurchaseOrderLineFilter {
        PurchaseOrderLineFilter::default()
    }

    pub fn purchase_order_id(mut self, filter: EqualFilter<String>) -> Self {
        self.purchase_order_id = Some(filter);
        self
    }
}
