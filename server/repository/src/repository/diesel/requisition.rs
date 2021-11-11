use super::StorageConnection;

use crate::{repository::RepositoryError, schema::RequisitionRow};

use diesel::prelude::*;

pub struct RequisitionRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionRepository { connection }
    }

    pub fn insert_one(&self, requisition_row: &RequisitionRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::requisition::dsl::*;
        diesel::insert_into(requisition)
            .values(requisition_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, requisition_id: &str) -> Result<RequisitionRow, RepositoryError> {
        use crate::schema::diesel_schema::requisition::dsl::*;
        let result = requisition
            .filter(id.eq(requisition_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<RequisitionRow>, RepositoryError> {
        use crate::schema::diesel_schema::requisition::dsl::*;
        let result = requisition
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
