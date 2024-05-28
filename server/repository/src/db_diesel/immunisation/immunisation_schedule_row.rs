use super::immunisation_schedule_row::immunisation_schedule::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    immunisation_schedule (id) {
        id -> Text,
        immunisation_id -> Text,
        dose_number -> Integer,
        label -> Text,

    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = immunisation_schedule)]
pub struct ImmunisationScheduleRow {
    pub id: String,
    pub immunisation_id: String,
    pub dose_number: i32,
    pub label: String,
}

pub struct ImmunisationScheduleRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ImmunisationScheduleRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ImmunisationScheduleRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        immunisation_schedule_row: &ImmunisationScheduleRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(immunisation_schedule)
            .values(immunisation_schedule_row)
            .on_conflict(id)
            .do_update()
            .set(immunisation_schedule_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        immunisation_schedule_row: &ImmunisationScheduleRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(immunisation_schedule)
            .values(immunisation_schedule_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<ImmunisationScheduleRow>, RepositoryError> {
        let result = immunisation_schedule.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        immunisation_schedule_id: &str,
    ) -> Result<Option<ImmunisationScheduleRow>, RepositoryError> {
        let result = immunisation_schedule
            .filter(id.eq(immunisation_schedule_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, immunisation_schedule_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(immunisation_schedule)
            .filter(id.eq(immunisation_schedule_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
