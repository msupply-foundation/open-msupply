use super::{
    item_link_row::{item_link, item_link::dsl as item_link_dsl},
    item_row::{item, item::dsl as item_dsl},
    location_row::{location, location::dsl as location_dsl},
    stock_line_row::{stock_line, stock_line::dsl as stock_line_dsl},
    stocktake_line_row::stocktake_line::{self, dsl as stocktake_line_dsl},
    LocationRow, StockLineRow, StocktakeLineRow, StorageConnection,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

use crate::{
    diesel_macros::{
        apply_equal_filter, apply_sort, apply_sort_asc_nulls_last, apply_sort_no_case,
    },
    DBType, EqualFilter, ItemFilter, ItemLinkRow, ItemRepository, ItemRow, Pagination,
    RepositoryError, Sort, StringFilter,
};

#[derive(Clone, Default)]
pub struct StocktakeLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub stocktake_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
    pub item_code_or_name: Option<StringFilter>,
}

impl StocktakeLineFilter {
    pub fn new() -> StocktakeLineFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn stocktake_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stocktake_id = Some(filter);
        self
    }

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }
}

pub enum StocktakeLineSortField {
    ItemCode,
    ItemName,
    /// Stocktake line batch
    Batch,
    /// Stocktake line expiry date
    ExpiryDate,
    /// Stocktake line pack size
    PackSize,
    /// Stocktake line item stock location code
    LocationCode,
}

pub type StocktakeLineSort = Sort<StocktakeLineSortField>;

type StocktakeLineJoin = (
    StocktakeLineRow,
    (ItemLinkRow, ItemRow),
    Option<StockLineRow>,
    Option<LocationRow>,
);

#[derive(Debug, Clone, PartialEq, Default)]
pub struct StocktakeLine {
    pub line: StocktakeLineRow,
    pub item: ItemRow,
    pub stock_line: Option<StockLineRow>,
    pub location: Option<LocationRow>,
}

pub struct StocktakeLineRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> StocktakeLineRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        StocktakeLineRepository { connection }
    }

    pub fn count(
        &mut self,
        filter: Option<StocktakeLineFilter>,
        store_id: Option<String>,
    ) -> Result<i64, RepositoryError> {
        let mut query = create_filtered_query(filter.clone());
        query = apply_item_filter(query, filter, self.connection, store_id.unwrap_or_default());
        Ok(query.count().get_result(&mut self.connection.connection)?)
    }

    pub fn query_by_filter(
        &mut self,
        filter: StocktakeLineFilter,
        store_id: Option<String>,
    ) -> Result<Vec<StocktakeLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None, store_id)
    }

    /// Query stocktake lines
    /// Note `store_id` is only required when filtering by item code or name
    pub fn query(
        &mut self,
        pagination: Pagination,
        filter: Option<StocktakeLineFilter>,
        sort: Option<StocktakeLineSort>,
        store_id: Option<String>,
    ) -> Result<Vec<StocktakeLine>, RepositoryError> {
        let mut query = create_filtered_query(filter.clone());
        query = apply_item_filter(query, filter, self.connection, store_id.unwrap_or_default());

        if let Some(sort) = sort {
            match sort.key {
                StocktakeLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item_dsl::name);
                }
                StocktakeLineSortField::ItemCode => {
                    apply_sort_no_case!(query, sort, item_dsl::code);
                }
                StocktakeLineSortField::Batch => {
                    apply_sort_no_case!(query, sort, stocktake_line_dsl::batch);
                }
                StocktakeLineSortField::ExpiryDate => {
                    apply_sort_asc_nulls_last!(query, sort, stocktake_line_dsl::expiry_date);
                }
                StocktakeLineSortField::PackSize => {
                    apply_sort!(query, sort, stocktake_line_dsl::pack_size);
                }
                StocktakeLineSortField::LocationCode => {
                    apply_sort_no_case!(query, sort, location_dsl::code);
                }
            };
        } else {
            query = query.order_by(stocktake_line_dsl::id.asc());
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StocktakeLineJoin>(&mut self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedStocktakeLineQuery = IntoBoxed<
    'static,
    LeftJoin<
        LeftJoin<
            InnerJoin<stocktake_line::table, InnerJoin<item_link::table, item::table>>,
            stock_line::table,
        >,
        location::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<StocktakeLineFilter>) -> BoxedStocktakeLineQuery {
    let mut query = stocktake_line_dsl::stocktake_line
        .inner_join(item_link_dsl::item_link.inner_join(item_dsl::item))
        .left_join(stock_line_dsl::stock_line)
        .left_join(location_dsl::location)
        .into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, stocktake_line_dsl::id);
        apply_equal_filter!(query, f.stocktake_id, stocktake_line_dsl::stocktake_id);
        apply_equal_filter!(query, f.location_id, stocktake_line_dsl::location_id);
    }

    query
}

fn to_domain((line, (_, item), stock_line, location): StocktakeLineJoin) -> StocktakeLine {
    StocktakeLine {
        line,
        item,
        stock_line,
        location,
    }
}

fn apply_item_filter(
    query: BoxedStocktakeLineQuery,
    filter: Option<StocktakeLineFilter>,
    connection: &mut StorageConnection,
    store_id: String,
) -> BoxedStocktakeLineQuery {
    if let Some(f) = filter {
        if let Some(item_code_or_name) = &f.item_code_or_name {
            let mut item_filter = ItemFilter::new();
            item_filter.code_or_name = Some(item_code_or_name.clone());
            item_filter.is_visible = Some(true);
            let items = ItemRepository::new(connection)
                .query_by_filter(item_filter, Some(store_id))
                .unwrap_or_default(); // if there is a database issue, allow the filter to fail silently
            let item_ids: Vec<String> = items.into_iter().map(|item| item.item_row.id).collect();

            return query.filter(item_dsl::id.eq_any(item_ids));
        }
    }
    query
}
