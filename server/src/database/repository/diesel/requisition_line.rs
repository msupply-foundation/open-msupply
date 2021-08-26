use crate::database::repository::repository::get_connection;
use crate::database::repository::RepositoryError;
use crate::database::schema::RequisitionLineRow;

use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use r2d2::Pool;

use super::DBBackendConnection;

#[derive(Clone)]
pub struct RequisitionLineRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl RequisitionLineRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> RequisitionLineRepository {
        RequisitionLineRepository { pool }
    }

    pub async fn insert_one(
        &self,
        requisition_line_row: &RequisitionLineRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(requisition_line)
            .values(requisition_line_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<RequisitionLineRow, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = requisition_line.filter(id.eq(row_id)).first(&connection);

        return result.map_err(|err| RepositoryError::from(err));
    }

    pub async fn find_many_by_requisition_id(
        &self,
        req_id: &str,
    ) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = requisition_line
            .filter(requisition_id.eq(req_id))
            .load(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }
}
