use super::StorageConnection;

use crate::{repository_error::RepositoryError, schema::MasterListLineRow};

use diesel::prelude::*;

pub struct MasterListLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListLineRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::master_list_line::dsl::*;
        diesel::insert_into(master_list_line)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::master_list_line::dsl::*;
        diesel::replace_into(master_list_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &self,
        line_id: &str,
    ) -> Result<MasterListLineRow, RepositoryError> {
        use crate::schema::diesel_schema::master_list_line::dsl::*;
        let result = master_list_line
            .filter(id.eq(line_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }
}
