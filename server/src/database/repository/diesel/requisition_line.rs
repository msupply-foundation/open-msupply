use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::RequisitionLineRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

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
        let result = requisition_line.filter(id.eq(row_id)).first(&connection)?;
        Ok(result)
    }

    pub async fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = requisition_line.filter(id.eq_any(ids)).load(&connection)?;
        Ok(result)
    }

    pub async fn find_many_by_requisition_id(
        &self,
        req_id: &str,
    ) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = requisition_line
            .filter(requisition_id.eq(req_id))
            .load(&connection)?;
        Ok(result)
    }
}
