use super::{
    item_row::item, purchase_order_line_row::purchase_order_line, DBType, ItemLinkRow, ItemRow,
    RepositoryError, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    item_link,
    purchase_order_row::purchase_order::{self},
    EqualFilter, Pagination, PurchaseOrderLineRow, PurchaseOrderRow, Sort,
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
}

pub enum PurchaseOrderLineSortField {
    ItemName,
    NumberOfPacks,
    LineNumber,
    RequestedQuantity,
    AuthorisedQuantity,
    TotalReceived,
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
        let query = create_filtered_query(filter)?;

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
        let mut query = create_filtered_query(filter)?;

        if let Some(sort) = sort {
            match sort.key {
                PurchaseOrderLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name);
                }
                PurchaseOrderLineSortField::NumberOfPacks => {
                    apply_sort!(query, sort, purchase_order_line::number_of_packs);
                }
                PurchaseOrderLineSortField::LineNumber => {
                    apply_sort!(query, sort, purchase_order_line::line_number);
                }
                PurchaseOrderLineSortField::RequestedQuantity => {
                    apply_sort!(query, sort, purchase_order_line::requested_quantity);
                }
                PurchaseOrderLineSortField::AuthorisedQuantity => {
                    apply_sort!(query, sort, purchase_order_line::authorised_quantity);
                }
                PurchaseOrderLineSortField::TotalReceived => {
                    apply_sort!(query, sort, purchase_order_line::total_received);
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

fn create_filtered_query(
    filter: Option<PurchaseOrderLineFilter>,
) -> Result<BoxedPurchaseOrderLineQuery, RepositoryError> {
    let mut query = purchase_order_line::table
        .inner_join(item_link::table.inner_join(item::table))
        .inner_join(purchase_order::table)
        .into_boxed();

    if let Some(f) = filter {
        let PurchaseOrderLineFilter {
            purchase_order_id,
            id,
            store_id,
        } = f;

        apply_equal_filter!(
            query,
            purchase_order_id,
            purchase_order_line::purchase_order_id
        );
        apply_equal_filter!(query, id, purchase_order_line::id);
        apply_equal_filter!(query, store_id, purchase_order::store_id);
    }

    Ok(query)
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
}

fn to_domain(
    (purchase_order_line_row, (_, item_row), _): PurchaseOrderLineJoin,
) -> PurchaseOrderLine {
    PurchaseOrderLine {
        purchase_order_line_row,
        item_row,
    }
}
