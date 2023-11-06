use super::{
    master_list_name_join::master_list_name_join::dsl::*, master_list_row::master_list,
    name_row::name, StorageConnection,
};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    master_list_name_join (id) {
        id -> Text,
        master_list_id -> Text,
        name_id -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[diesel(table_name = master_list_name_join)]
pub struct MasterListNameJoinRow {
    pub id: String,
    pub master_list_id: String,
    pub name_id: String,
}

joinable!(master_list_name_join -> master_list (master_list_id));
joinable!(master_list_name_join -> name (name_id));

pub struct MasterListNameJoinRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> MasterListNameJoinRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        MasterListNameJoinRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list_name_join)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(master_list_name_join)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &mut self,
        record_id: &str,
    ) -> Result<MasterListNameJoinRow, RepositoryError> {
        let result = master_list_name_join
            .filter(id.eq(record_id))
            .first(&mut self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id_option(
        &self,
        record_id: &str,
    ) -> Result<Option<MasterListNameJoinRow>, RepositoryError> {
        let result = master_list_name_join
            .filter(id.eq(record_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, record_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list_name_join.filter(id.eq(record_id)))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}
