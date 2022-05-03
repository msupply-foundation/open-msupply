use super::{master_list_line_row::master_list_line::dsl::*, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    master_list_line (id) {
        id -> Text,
        item_id -> Text,
        master_list_id -> Text,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "master_list_line"]
pub struct MasterListLineRow {
    pub id: String,
    pub item_id: String,
    pub master_list_id: String,
}

pub struct MasterListLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &MasterListLineRow) -> Result<(), RepositoryError> {
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
        diesel::replace_into(master_list_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(
        &self,
        line_id: &str,
    ) -> Result<MasterListLineRow, RepositoryError> {
        let result = master_list_line
            .filter(id.eq(line_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }
}
