use crate::StorageConnection;
use crate::{repository_error::RepositoryError, schema::RequisitionLineRow};

use crate::schema::diesel_schema::requisition_line::dsl as requisition_line_dsl;
use diesel::prelude::*;

pub struct RequisitionLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(requisition_line_dsl::requisition_line)
            .values(row)
            .on_conflict(requisition_line_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(requisition_line_dsl::requisition_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, requisition_line_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            requisition_line_dsl::requisition_line
                .filter(requisition_line_dsl::id.eq(requisition_line_id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionLineRow>, RepositoryError> {
        let result = requisition_line_dsl::requisition_line
            .filter(requisition_line_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
