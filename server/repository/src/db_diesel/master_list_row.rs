use super::{master_list_row::master_list::dsl::*, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    master_list (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        description -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[diesel(table_name = master_list)]
pub struct MasterListRow {
    pub id: String,
    pub name: String,
    pub code: String,
    pub description: String,
}

pub struct MasterListRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> MasterListRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        MasterListRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &MasterListRow) -> Result<(), RepositoryError> {
        diesel::insert_into(master_list)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &MasterListRow) -> Result<(), RepositoryError> {
        diesel::replace_into(master_list)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &mut self,
        master_list_id: &str,
    ) -> Result<MasterListRow, RepositoryError> {
        let result = master_list
            .filter(id.eq(master_list_id))
            .first(&mut self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id_option(
        &self,
        master_list_id: &str,
    ) -> Result<Option<MasterListRow>, RepositoryError> {
        let result = master_list
            .filter(id.eq(master_list_id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, master_list_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(master_list.filter(id.eq(master_list_id)))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}
