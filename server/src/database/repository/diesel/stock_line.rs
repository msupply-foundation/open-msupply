use super::StorageConnection;

use crate::{
    database::{
        repository::RepositoryError,
        schema::{diesel_schema::stock_line::dsl as stock_line_dsl, StockLineRow},
    },
    domain::stock_line::StockLine,
};

use diesel::prelude::*;

pub struct StockLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineRepository { connection }
    }

    pub async fn insert_one(&self, stock_line_row: &StockLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stock_line_dsl::stock_line)
            .values(stock_line_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_many_by_item_ids(
        &self,
        item_ids: &[String],
    ) -> Result<Vec<StockLine>, RepositoryError> {
        Ok(stock_line_dsl::stock_line
            .filter(stock_line_dsl::item_id.eq_any(item_ids))
            .load::<StockLineRow>(&self.connection.connection)?
            .into_iter()
            .map(StockLine::from)
            .collect())
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<StockLine>, RepositoryError> {
        Ok(stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq_any(ids))
            .load::<StockLineRow>(&self.connection.connection)?
            .into_iter()
            .map(StockLine::from)
            .collect())
    }

    pub async fn find_one_by_id(
        &self,
        stock_line_id: &str,
    ) -> Result<StockLineRow, RepositoryError> {
        let result = stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq(stock_line_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }
}

impl From<StockLineRow> for StockLine {
    fn from(
        StockLineRow {
            id,
            item_id,
            store_id,
            batch,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            available_number_of_packs,
            total_number_of_packs,
            expiry_date,
        }: StockLineRow,
    ) -> Self {
        StockLine {
            id,
            item_id,
            store_id,
            batch,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            available_number_of_packs,
            total_number_of_packs,
            expiry_date,
        }
    }
}
