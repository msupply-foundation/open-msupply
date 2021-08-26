use crate::database::repository::repository::get_connection;
use crate::database::repository::RepositoryError;
use crate::database::schema::RequisitionRow;

use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use r2d2::Pool;

use super::DBBackendConnection;

#[derive(Clone)]
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
        let result = requisition.filter(id.eq(requisition_id)).first(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }
}
