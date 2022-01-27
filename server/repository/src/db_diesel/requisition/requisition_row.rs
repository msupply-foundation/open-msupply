use crate::StorageConnection;
use crate::{repository_error::RepositoryError, schema::RequisitionRow};

use crate::schema::diesel_schema::requisition::dsl as requisition_dsl;
use diesel::prelude::*;

pub struct RequisitionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &RequisitionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(requisition_dsl::requisition)
            .values(row)
            .on_conflict(requisition_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &RequisitionRow) -> Result<(), RepositoryError> {
        diesel::replace_into(requisition_dsl::requisition)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, requisition_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(requisition_dsl::requisition.filter(requisition_dsl::id.eq(requisition_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionRow>, RepositoryError> {
        let result = requisition_dsl::requisition
            .filter(requisition_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
