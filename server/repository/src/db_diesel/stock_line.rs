use super::{DBType, StorageConnection};

use crate::{
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{
            location, location::dsl as location_dsl, stock_line, stock_line::dsl as stock_line_dsl,
        },
        LocationRow, StockLineRow,
    },
};
use domain::{
    stock_line::{StockLine, StockLineFilter, StockLineSort},
    Pagination,
};

use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};

type StockLineJoin = (StockLineRow, Option<LocationRow>);
pub struct StockLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineRepository { connection }
    }

    pub fn query_by_filter(
        &self,
        filter: StockLineFilter,
    ) -> Result<Vec<StockLine>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockLineFilter>,
        _: Option<StockLineSort>,
    ) -> Result<Vec<StockLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StockLineJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedStockLineQuery = IntoBoxed<'static, LeftJoin<stock_line::table, location::table>, DBType>;

fn create_filtered_query(filter: Option<StockLineFilter>) -> BoxedStockLineQuery {
    let mut query = stock_line_dsl::stock_line
        .left_join(location_dsl::location)
        .into_boxed();

    if let Some(f) = filter {
        if let Some(value) = f.id {
            if let Some(eq) = value.equal_to {
                query = query.filter(stock_line_dsl::id.eq(eq));
            }

            if let Some(eq) = value.equal_any {
                query = query.filter(stock_line_dsl::id.eq_any(eq));
            }
        }

        if let Some(value) = f.item_ids {
            if let Some(eq) = value.equal_any {
                query = query.filter(stock_line_dsl::item_id.eq_any(eq));
            }
        }
    }

    query
}

fn to_domain(
    (
        StockLineRow {
            id,
            item_id,
            store_id,
            location_id,
            batch,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            available_number_of_packs,
            total_number_of_packs,
            expiry_date,
            on_hold,
            note,
        },
        location_row_option,
    ): StockLineJoin,
) -> StockLine {
    StockLine {
        id,
        item_id,
        store_id,
        location_id,
        batch,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        available_number_of_packs,
        total_number_of_packs,
        expiry_date,
        on_hold,
        note,
        location_name: location_row_option.map(|location_row| location_row.name),
    }
}
