use super::immunisation_row::immunisation::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    immunisation (id) {
        id -> Text,
        name -> Text,
        immunisation_program_id -> Text,
        demographic_indicator_id -> Text,
        coverage_rate -> Double,
        is_active -> Bool,
        wastage_rate -> Double,
        doses -> Integer,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Serialize, Deserialize, Default,
)]
#[diesel(table_name = immunisation)]
pub struct ImmunisationRow {
    pub id: String,
    pub name: String,
    pub immunisation_program_id: String,
    pub demographic_indicator_id: String,
    pub coverage_rate: f64,
    pub is_active: bool,
    pub wastage_rate: f64,
    pub doses: i32,
}

pub struct ImmunisationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ImmunisationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ImmunisationRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, immunisation_row: &ImmunisationRow) -> Result<(), RepositoryError> {
        diesel::insert_into(immunisation)
            .values(immunisation_row)
            .on_conflict(id)
            .do_update()
            .set(immunisation_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, immunisation_row: &ImmunisationRow) -> Result<(), RepositoryError> {
        diesel::replace_into(immunisation)
            .values(immunisation_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<ImmunisationRow>, RepositoryError> {
        let result = immunisation.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        immunisation_id: &str,
    ) -> Result<Option<ImmunisationRow>, RepositoryError> {
        let result = immunisation
            .filter(id.eq(immunisation_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, immunisation_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(immunisation)
            .filter(id.eq(immunisation_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
