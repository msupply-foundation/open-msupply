use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::RequisitionRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct RequisitionRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl RequisitionRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> RequisitionRepository {
        RequisitionRepository { pool }
    }

    pub async fn insert_one(
        &self,
        requisition_row: &RequisitionRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::requisition::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(requisition)
            .values(requisition_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &self,
        requisition_id: &str,
    ) -> Result<RequisitionRow, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = requisition
            .filter(id.eq(requisition_id))
            .first(&connection)?;
        Ok(result)
    }

    pub async fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<RequisitionRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::requisition::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = requisition.filter(id.eq_any(ids)).load(&connection)?;
        Ok(result)
    }
}
