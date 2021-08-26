use crate::database::repository::repository::get_connection;
use crate::database::repository::RepositoryError;
use crate::database::schema::TransactLineRow;

use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use r2d2::Pool;

use super::DBBackendConnection;

#[derive(Clone)]
pub struct TransactLineRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl TransactLineRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> TransactLineRepository {
        TransactLineRepository { pool }
    }

    pub async fn insert_one(
        &self,
        transact_line_row: &TransactLineRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::transact_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(transact_line)
            .values(transact_line_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, row_id: &str) -> Result<TransactLineRow, RepositoryError> {
        use crate::database::schema::diesel_schema::transact_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = transact_line.filter(id.eq(row_id)).first(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }

    pub async fn find_many_by_transact_id(
        &self,
        trans_id: &str,
    ) -> Result<Vec<TransactLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::transact_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = transact_line
            .filter(transact_id.eq(trans_id))
            .get_results(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }
}
