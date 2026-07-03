use super::{
    item_row::{item, ItemRow},
    location_row::{location, LocationRow},
    stock_line_row::{stock_line, StockLineRow},
    stock_relocation_line_row::{stock_relocation_line, StockRelocationLineRow},
    DBType, RepositoryError, StorageConnection,
};
use crate::diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case};
use crate::{EqualFilter, Pagination, Sort};
use diesel::prelude::*;

diesel::alias!(
    location as source_location: SourceLocation,
    location as destination_location: DestinationLocation,
);

#[derive(PartialEq, Debug, Clone, Default)]
pub struct StockRelocationLine {
    pub stock_relocation_line_row: StockRelocationLineRow,
    pub stock_line_row: StockLineRow,
    pub item_row: ItemRow,
    pub source_location_row: Option<LocationRow>,
    pub destination_location_row: Option<LocationRow>,
}

#[derive(Clone, Default)]
pub struct StockRelocationLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub stock_relocation_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum StockRelocationLineSortField {
    ItemCode,
    ItemName,
    Batch,
    ExpiryDate,
    NumberOfPacks,
    PackSize,
}

pub type StockRelocationLineSort = Sort<StockRelocationLineSortField>;

type StockRelocationLineJoin = (
    StockRelocationLineRow,
    (StockLineRow, ItemRow),
    Option<LocationRow>,
    Option<LocationRow>,
);

pub struct StockRelocationLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockRelocationLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockRelocationLineRepository { connection }
    }

    pub fn count(&self, filter: Option<StockRelocationLineFilter>) -> Result<i64, RepositoryError> {
        let mut query = stock_relocation_line::table
            .inner_join(
                stock_line::table
                    .inner_join(item::table)
                    .on(stock_line::id.eq(stock_relocation_line::stock_line_id)),
            )
            .left_join(
                source_location.on(source_location
                    .field(location::id)
                    .nullable()
                    .eq(stock_relocation_line::source_location_id)),
            )
            .left_join(
                destination_location.on(destination_location
                    .field(location::id)
                    .nullable()
                    .eq(stock_relocation_line::destination_location_id)),
            )
            .into_boxed::<DBType>();

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, stock_relocation_line::id);
            apply_equal_filter!(
                query,
                f.stock_relocation_id,
                stock_relocation_line::stock_relocation_id
            );
        }

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: StockRelocationLineFilter,
    ) -> Result<Vec<StockRelocationLine>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockRelocationLineFilter>,
        sort: Option<StockRelocationLineSort>,
    ) -> Result<Vec<StockRelocationLine>, RepositoryError> {
        let mut query = stock_relocation_line::table
            .inner_join(
                stock_line::table
                    .inner_join(item::table)
                    .on(stock_line::id.eq(stock_relocation_line::stock_line_id)),
            )
            .left_join(
                source_location.on(source_location
                    .field(location::id)
                    .nullable()
                    .eq(stock_relocation_line::source_location_id)),
            )
            .left_join(
                destination_location.on(destination_location
                    .field(location::id)
                    .nullable()
                    .eq(stock_relocation_line::destination_location_id)),
            )
            .into_boxed::<DBType>();

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, stock_relocation_line::id);
            apply_equal_filter!(
                query,
                f.stock_relocation_id,
                stock_relocation_line::stock_relocation_id
            );
        }

        if let Some(sort) = sort {
            match sort.key {
                StockRelocationLineSortField::ItemCode => {
                    apply_sort_no_case!(query, sort, item::code)
                }
                StockRelocationLineSortField::ItemName => {
                    apply_sort_no_case!(query, sort, item::name)
                }
                StockRelocationLineSortField::Batch => {
                    apply_sort_no_case!(query, sort, stock_line::batch)
                }
                StockRelocationLineSortField::ExpiryDate => {
                    apply_sort!(query, sort, stock_line::expiry_date)
                }
                StockRelocationLineSortField::NumberOfPacks => {
                    apply_sort!(query, sort, stock_relocation_line::number_of_packs)
                }
                StockRelocationLineSortField::PackSize => {
                    apply_sort!(query, sort, stock_line::pack_size)
                }
            }
        } else {
            query = query.order(stock_relocation_line::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StockRelocationLineJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(
    (
        stock_relocation_line_row,
        (stock_line_row, item_row),
        source_location_row,
        destination_location_row,
    ): StockRelocationLineJoin,
) -> StockRelocationLine {
    StockRelocationLine {
        stock_relocation_line_row,
        stock_line_row,
        item_row,
        source_location_row,
        destination_location_row,
    }
}

impl StockRelocationLineFilter {
    pub fn new() -> StockRelocationLineFilter {
        StockRelocationLineFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn stock_relocation_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_relocation_id = Some(filter);
        self
    }
}
