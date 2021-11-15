use super::{DBType, StorageConnection};

use crate::{
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{stock_line, stock_line::dsl as stock_line_dsl},
        StockLineRow,
    },
};
use domain::{
    stock_line::{StockLine, StockLineFilter, StockLineSort},
    Pagination,
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

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StockLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stock_line_dsl::stock_line)
            .values(row)
            .on_conflict(stock_line_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "sqlite")]
    pub fn upsert_one(&self, row: &StockLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(stock_line_dsl::stock_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stock_line_dsl::stock_line.filter(stock_line_dsl::id.eq(id)))
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

    pub fn find_one_by_id(&self, stock_line_id: &str) -> Result<StockLineRow, RepositoryError> {
        let result = stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq(stock_line_id))
            .first(&self.connection.connection)?;
        Ok(result)
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
            .load::<StockLineRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(StockLine::from).collect())
    }
}

type BoxedInvoiceLineQuery = stock_line::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<StockLineFilter>) -> BoxedInvoiceLineQuery {
    let mut query = stock_line::table.into_boxed();

    if let Some(f) = filter {
        if let Some(value) = f.id {
            if let Some(eq) = value.equal_to {
                query = query.filter(stock_line_dsl::id.eq(eq));
            }
        }
    }

    query
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
            on_hold,
            note,
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
            on_hold,
            note,
        }
    }
}
