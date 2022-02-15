use super::StorageConnection;

use crate::schema::diesel_schema::stocktake::dsl as stocktake_dsl;
use crate::{repository_error::RepositoryError, schema::StocktakeRow};

use diesel::prelude::*;

pub struct StocktakeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StocktakeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StocktakeRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StocktakeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(stocktake_dsl::stocktake)
            .values(row)
            .on_conflict(stocktake_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &StocktakeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(stocktake_dsl::stocktake)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(stocktake_dsl::stocktake.filter(stocktake_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<StocktakeRow>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional();
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StocktakeRow>, RepositoryError> {
        let result = stocktake_dsl::stocktake
            .filter(stocktake_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
