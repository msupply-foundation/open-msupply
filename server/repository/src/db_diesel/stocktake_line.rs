use super::{
    item_link_row::item_link, item_row::item, location_row::location,
    name_row::name, reason_option_row::reason_option, stock_line_row::stock_line,
    stocktake_line_row::stocktake_line, LocationRow, NameRow, ReasonOptionRow,
    StockLineRow, StocktakeLineRow, StorageConnection,
};

use diesel::{
    dsl::{Eq, InnerJoin, IntoBoxed, LeftJoin, LeftJoinOn, Nullable},
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
    pub item_id: Option<EqualFilter<String>>,
    pub stock_line_id: Option<EqualFilter<String>>,
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

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn stock_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_line_id = Some(filter);
        self
    }
}

pub enum StocktakeLineSortField {
    ItemCode,
    ItemName,
    Batch,
    ExpiryDate,
    PackSize,
    LocationCode,
    SnapshotNumberOfPacks,
    CountedNumberOfPacks,
    ReasonOption,
}

pub type StocktakeLineSort = Sort<StocktakeLineSortField>;

type StocktakeLineJoin = (
    StocktakeLineRow,
    (ItemLinkRow, ItemRow),
    Option<StockLineRow>,
    Option<LocationRow>,
    Option<NameRow>,
    Option<ReasonOptionRow>,
);

#[derive(Debug, Clone, PartialEq, Default)]
pub struct StocktakeLine {
    pub line: StocktakeLineRow,
    pub item: ItemRow,
    pub stock_line: Option<StockLineRow>,
    pub location: Option<LocationRow>,
    pub donor: Option<NameRow>,
    pub reason_option: Option<ReasonOptionRow>,
}

pub struct StocktakeLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StocktakeLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StocktakeLineRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<StocktakeLineFilter>,
        store_id: Option<String>,
    ) -> Result<i64, RepositoryError> {
        let mut query = Self::create_filtered_query(filter.clone());
        query = apply_item_filter(query, filter, self.connection, store_id.unwrap_or_default());
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: StocktakeLineFilter,
        store_id: Option<String>,
    ) -> Result<Vec<StocktakeLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None, store_id)
    }

    /// Query stocktake lines
    /// Note `store_id` is only required when filtering by item code or name
    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StocktakeLineFilter>,
        sort: Option<StocktakeLineSort>,
        store_id: Option<String>,
    ) -> Result<Vec<StocktakeLine>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter.clone());
        query = apply_item_filter(query, filter, self.connection, store_id.unwrap_or_default());

        if let Some(sort) = sort {
            match sort.key {
                StocktakeLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name);
                }
                StocktakeLineSortField::ItemCode => {
                    apply_sort_no_case!(query, sort, item::code);
                }
                StocktakeLineSortField::Batch => {
                    apply_sort_no_case!(query, sort, stocktake_line::batch);
                }
                StocktakeLineSortField::ExpiryDate => {
                    apply_sort_asc_nulls_last!(query, sort, stocktake_line::expiry_date);
                }
                StocktakeLineSortField::PackSize => {
                    apply_sort!(query, sort, stocktake_line::pack_size);
                }
                StocktakeLineSortField::LocationCode => {
                    apply_sort_no_case!(query, sort, location::code);
                }
                StocktakeLineSortField::SnapshotNumberOfPacks => {
                    apply_sort!(query, sort, stocktake_line::snapshot_number_of_packs);
                }
                StocktakeLineSortField::CountedNumberOfPacks => {
                    apply_sort!(query, sort, stocktake_line::counted_number_of_packs);
                }
                StocktakeLineSortField::ReasonOption => {
                    apply_sort_no_case!(query, sort, reason_option::reason);
                }
            };
        } else {
            query = query.order_by(stocktake_line::id.asc());
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StocktakeLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(filter: Option<StocktakeLineFilter>) -> BoxedStocktakeLineQuery {
        let mut query = stocktake_line::table
            .inner_join(item_link::table.inner_join(item::table))
            .left_join(stock_line::table)
            .left_join(location::table)
            .left_join(name::table.on(stocktake_line::donor_id.eq(name::id.nullable())))
            .left_join(reason_option::table)
            .into_boxed();

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, stocktake_line::id);
            apply_equal_filter!(query, f.stocktake_id, stocktake_line::stocktake_id);
            apply_equal_filter!(query, f.location_id, stocktake_line::location_id);
            apply_equal_filter!(query, f.item_id, item::id);
            apply_equal_filter!(query, f.stock_line_id, stocktake_line::stock_line_id);
        }

        query
    }
}

type BoxedStocktakeLineQuery = IntoBoxed<
    'static,
    LeftJoin<
        LeftJoinOn<
            LeftJoin<
                LeftJoin<
                    InnerJoin<stocktake_line::table, InnerJoin<item_link::table, item::table>>,
                    stock_line::table,
                >,
                location::table,
            >,
            name::table,
            Eq<stocktake_line::donor_id, Nullable<name::id>>,
        >,
        reason_option::table,
    >,
    DBType,
>;

fn to_domain(
    (line, (_, item), stock_line, location, donor, reason_option): StocktakeLineJoin,
) -> StocktakeLine {
    StocktakeLine {
        line,
        item,
        stock_line,
        location,
        donor,
        reason_option,
    }
}

fn apply_item_filter(
    query: BoxedStocktakeLineQuery,
    filter: Option<StocktakeLineFilter>,
    connection: &StorageConnection,
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

            return query.filter(item::id.eq_any(item_ids));
        }
    }
    query
}
