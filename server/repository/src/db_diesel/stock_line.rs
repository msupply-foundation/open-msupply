use super::{DBType, StorageConnection};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter},
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

    pub fn count(&self, filter: Option<StockLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
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
        apply_equal_filter!(query, f.id, stock_line_dsl::id);
        apply_equal_filter!(query, f.item_id, stock_line_dsl::item_id);
        apply_equal_filter!(query, f.location_id, stock_line_dsl::location_id);
        apply_date_time_filter!(query, f.expiry_date, stock_line_dsl::expiry_date);
    }

    query
}

pub fn to_domain(
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
