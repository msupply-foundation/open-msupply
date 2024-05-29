use super::program_row::program::dsl as program_dsl;

use crate::{
    db_diesel::{
        context_row::context, document::document, master_list_row::master_list,
        name_link_row::name_link,
    },
    repository_error::RepositoryError,
    StorageConnection, Upsert,
};

use diesel::prelude::*;

table! {
    program (id) {
        id -> Text,
        master_list_id -> Text,
        name -> Text,
        context_id -> Text,
    }
}

joinable!(program -> master_list (master_list_id));
joinable!(program -> context (context_id));
allow_tables_to_appear_in_same_query!(program, document);
allow_tables_to_appear_in_same_query!(program, name_link);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[table_name = "program"]
pub struct ProgramRow {
    pub id: String, // Master list id
    pub master_list_id: String,
    pub name: String,
    pub context_id: String,
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

impl Upsert for ProgramRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ProgramRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ProgramRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
