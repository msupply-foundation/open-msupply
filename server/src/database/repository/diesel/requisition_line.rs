use super::StorageConnection;

use crate::database::{repository::RepositoryError, schema::RequisitionLineRow};

use diesel::prelude::*;

pub struct RequisitionLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionLineRepository { connection }
    }

    pub fn insert_one(
        &self,
        requisition_line_row: &RequisitionLineRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        diesel::insert_into(requisition_line)
            .values(requisition_line_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<RequisitionLineRow, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        let result = requisition_line
            .filter(id.eq(row_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        let result = requisition_line
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_requisition_id(
        &self,
        req_id: &str,
    ) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition_line::dsl::*;
        let result = requisition_line
            .filter(requisition_id.eq(req_id))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
