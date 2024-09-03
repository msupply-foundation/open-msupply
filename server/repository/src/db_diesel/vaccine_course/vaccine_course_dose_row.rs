use super::vaccine_course_dose_row::vaccine_course_dose::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    vaccine_course_dose (id) {
        id -> Text,
        vaccine_course_id -> Text,
        label -> Text,
        min_age -> Double,
        min_interval_days -> Integer,

    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = vaccine_course_dose)]
pub struct VaccineCourseDoseRow {
    pub id: String,
    pub vaccine_course_id: String,
    pub label: String,
    pub min_age: f64,
    pub min_interval_days: i32,
}

pub struct VaccineCourseDoseRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseDoseRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseDoseRowRepository { connection }
    }

    pub fn upsert_one(
        &self,
        vaccine_course_dose_row: &VaccineCourseDoseRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(vaccine_course_dose)
            .values(vaccine_course_dose_row)
            .on_conflict(id)
            .do_update()
            .set(vaccine_course_dose_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<VaccineCourseDoseRow>, RepositoryError> {
        let result = vaccine_course_dose.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        vaccine_course_dose_id: &str,
    ) -> Result<Option<VaccineCourseDoseRow>, RepositoryError> {
        let result = vaccine_course_dose
            .filter(id.eq(vaccine_course_dose_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, vaccine_course_dose_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vaccine_course_dose)
            .filter(id.eq(vaccine_course_dose_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete_by_vaccine_course_id(&self, course_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vaccine_course_dose)
            .filter(vaccine_course_id.eq(course_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
