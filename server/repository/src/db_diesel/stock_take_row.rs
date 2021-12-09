use super::StorageConnection;

use crate::schema::diesel_schema::stock_take::dsl as stock_take_dsl;
use crate::{repository_error::RepositoryError, schema::StockTakeRow};

use diesel::prelude::*;

pub struct StockTakeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockTakeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockTakeRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StockTakeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stock_take_dsl::stock_take)
            .values(row)
            .on_conflict(stock_take_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &StockTakeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(stock_take_dsl::stock_take)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stock_take_dsl::stock_take.filter(stock_take_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StockTakeRow>, RepositoryError> {
        let result = stock_take_dsl::stock_take
            .filter(stock_take_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StockTakeRow>, RepositoryError> {
        let result = stock_take_dsl::stock_take
            .filter(stock_take_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
