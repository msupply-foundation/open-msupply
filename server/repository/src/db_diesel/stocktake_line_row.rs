use super::StorageConnection;

use crate::schema::diesel_schema::stocktake_line::dsl as stocktake_line_dsl;
use crate::{repository_error::RepositoryError, schema::StocktakeLineRow};

use diesel::prelude::*;

pub struct StocktakeLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StocktakeLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StocktakeLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StocktakeLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stocktake_line_dsl::stocktake_line)
            .values(row)
            .on_conflict(stocktake_line_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &StocktakeLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(stocktake_line_dsl::stocktake_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stocktake_line_dsl::stocktake_line.filter(stocktake_line_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StocktakeLineRow>, RepositoryError> {
        let result = stocktake_line_dsl::stocktake_line
            .filter(stocktake_line_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
        let result = stocktake_line_dsl::stocktake_line
            .filter(stocktake_line_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
