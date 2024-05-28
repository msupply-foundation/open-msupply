use super::immunisation_program_row::immunisation_program::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    immunisation_program (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = immunisation_program)]
pub struct ImmunisationProgramRow {
    pub id: String,
    pub name: String,
}

pub struct ImmunisationProgramRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ImmunisationProgramRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ImmunisationProgramRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        immunisation_program_row: &ImmunisationProgramRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(immunisation_program)
            .values(immunisation_program_row)
            .on_conflict(id)
            .do_update()
            .set(immunisation_program_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        immunisation_program_row: &ImmunisationProgramRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(immunisation_program)
            .values(immunisation_program_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<ImmunisationProgramRow>, RepositoryError> {
        let result = immunisation_program.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        immunisation_program_id: &str,
    ) -> Result<Option<ImmunisationProgramRow>, RepositoryError> {
        let result = immunisation_program
            .filter(id.eq(immunisation_program_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, immunisation_program_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(immunisation_program)
            .filter(id.eq(immunisation_program_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
