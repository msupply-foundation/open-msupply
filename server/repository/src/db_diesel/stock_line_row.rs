use super::StorageConnection;

use crate::{
    repository_error::RepositoryError,
    schema::{diesel_schema::stock_line::dsl as stock_line_dsl, StockLineRow},
};

use diesel::prelude::*;

pub struct StockLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineRowRepository { connection }
    }

    #[cfg(all(feature = "postgres", not(feature = "sqlite")))]
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

    pub fn find_one_by_id(&self, stock_line_id: &str) -> Result<StockLineRow, RepositoryError> {
        let result = stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq(stock_line_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<StockLineRow>, RepositoryError> {
        stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq_any(ids))
            .load::<StockLineRow>(&self.connection.connection)
            .map_err(RepositoryError::from)
    }
}
