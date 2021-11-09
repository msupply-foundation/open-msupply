use super::StorageConnection;

use crate::{repository::RepositoryError, schema::MasterListNameJoinRow};

use diesel::prelude::*;

pub struct MasterListNameJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListNameJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListNameJoinRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::master_list_name_join::dsl::*;
        diesel::insert_into(master_list_name_join)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "sqlite")]
    pub fn upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::master_list_name_join::dsl::*;
        diesel::replace_into(master_list_name_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &self,
        item_id: &str,
    ) -> Result<MasterListNameJoinRow, RepositoryError> {
        use crate::schema::diesel_schema::master_list_name_join::dsl::*;
        let result = master_list_name_join
            .filter(id.eq(item_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }
}
