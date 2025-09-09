use super::{
    item_row::item, purchase_order_line_row::purchase_order_line, DBType, ItemLinkRow, ItemRow,
    RepositoryError, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    item_link,
    purchase_order_row::purchase_order::{self},
    EqualFilter, Pagination, PurchaseOrderLineRow, PurchaseOrderLineStatus, PurchaseOrderRow, Sort,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

type PurchaseOrderLineJoin = (
    PurchaseOrderLineRow,
    (ItemLinkRow, ItemRow),
    PurchaseOrderRow,
);

#[derive(Debug, PartialEq, Clone, Default)]
pub struct PurchaseOrderLine {
    pub purchase_order_line_row: PurchaseOrderLineRow,
    pub item_row: ItemRow,
}

#[derive(Clone, Default)]
pub struct PurchaseOrderLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub purchase_order_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub requested_pack_size: Option<EqualFilter<f64>>,
    pub item_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<PurchaseOrderLineStatus>>,
}

pub enum PurchaseOrderLineSortField {
    ItemName,
    LineNumber,
    // RequestedQuantity, // TODO: Bring back sorting as needed by frontend
    // AuthorisedQuantity,
    // TotalReceived,
    RequestedDeliveryDate,
    ExpectedDeliveryDate,
}

pub type PurchaseOrderLineSort = Sort<PurchaseOrderLineSortField>;

pub struct PurchaseOrderLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PurchaseOrderLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PurchaseOrderLineRepository { connection }
    }

    pub fn count(&self, filter: Option<PurchaseOrderLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result::<i64>(self.connection.lock().connection())?)
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
                PurchaseOrderLineSortField::LineNumber => {
                    apply_sort!(query, sort, purchase_order_line::line_number);
                }

                PurchaseOrderLineSortField::RequestedDeliveryDate => {
                    apply_sort!(query, sort, purchase_order_line::requested_delivery_date);
                }
                PurchaseOrderLineSortField::ExpectedDeliveryDate => {
                    apply_sort!(query, sort, purchase_order_line::expected_delivery_date);
                }
            }
        } else {
            query = query.order(purchase_order_line::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result =
            final_query.load::<PurchaseOrderLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedPurchaseOrderLineQuery = IntoBoxed<
    'static,
    InnerJoin<
        InnerJoin<purchase_order_line::table, InnerJoin<item_link::table, item::table>>,
        purchase_order::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<PurchaseOrderLineFilter>) -> BoxedPurchaseOrderLineQuery {
    let mut query = purchase_order_line::table
        .inner_join(item_link::table.inner_join(item::table))
        .inner_join(purchase_order::table)
        .into_boxed();

    if let Some(f) = filter {
        let PurchaseOrderLineFilter {
            purchase_order_id,
            id,
            store_id,
            requested_pack_size,
            item_id,
            status,
        } = f;

        apply_equal_filter!(query, purchase_order_id, purchase_order::id);
        apply_equal_filter!(query, id, purchase_order_line::id);
        apply_equal_filter!(query, store_id, purchase_order::store_id);
        apply_equal_filter!(
            query,
            requested_pack_size,
            purchase_order_line::requested_pack_size
        );
        apply_equal_filter!(query, item_id, item_link::item_id);
        apply_equal_filter!(query, status, purchase_order_line::status);
    }

    query
}

impl PurchaseOrderLineFilter {
    pub fn new() -> PurchaseOrderLineFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn purchase_order_id(mut self, filter: EqualFilter<String>) -> Self {
        self.purchase_order_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn requested_pack_size(mut self, filter: EqualFilter<f64>) -> Self {
        self.requested_pack_size = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<PurchaseOrderLineStatus>) -> Self {
        self.status = Some(filter);
        self
    }
}

fn to_domain(
    (purchase_order_line_row, (_, item_row), _): PurchaseOrderLineJoin,
) -> PurchaseOrderLine {
    PurchaseOrderLine {
        purchase_order_line_row,
        item_row,
    }
}

impl PurchaseOrderLineStatus {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}
