use super::program_row::program::dsl as program_dsl;

use crate::{
    db_diesel::master_list_row::master_list, repository_error::RepositoryError, StorageConnection,
};

use diesel::prelude::*;

table! {
    program (id) {
        id -> Text,
        name -> Text,
    }
}

joinable!(program -> master_list (id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[table_name = "program"]
pub struct ProgramRow {
    pub id: String, // Master list id
    pub name: String,
}

pub struct ProgramRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ProgramRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_dsl::program)
            .values(row)
            .on_conflict(program_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ProgramRow) -> Result<(), RepositoryError> {
        diesel::replace_into(program_dsl::program)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ProgramRow>, RepositoryError> {
        let result = program_dsl::program
            .filter(program_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
