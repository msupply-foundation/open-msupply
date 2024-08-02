use super::vaccine_course_schedule_row::vaccine_course_schedule::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    vaccine_course_schedule (id) {
        id -> Text,
        vaccine_course_id -> Text,
        dose_number -> Integer,
        label -> Text,

    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = vaccine_course_schedule)]
pub struct VaccineCourseScheduleRow {
    pub id: String,
    pub vaccine_course_id: String,
    pub dose_number: i32,
    pub label: String,
}

pub struct VaccineCourseScheduleRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseScheduleRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseScheduleRowRepository { connection }
    }

    pub fn upsert_one(
        &self,
        vaccine_course_schedule_row: &VaccineCourseScheduleRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(vaccine_course_schedule)
            .values(vaccine_course_schedule_row)
            .on_conflict(id)
            .do_update()
            .set(vaccine_course_schedule_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<VaccineCourseScheduleRow>, RepositoryError> {
        let result = vaccine_course_schedule.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        vaccine_course_schedule_id: &str,
    ) -> Result<Option<VaccineCourseScheduleRow>, RepositoryError> {
        let result = vaccine_course_schedule
            .filter(id.eq(vaccine_course_schedule_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, vaccine_course_schedule_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vaccine_course_schedule)
            .filter(id.eq(vaccine_course_schedule_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete_by_vaccine_course_id(&self, course_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vaccine_course_schedule)
            .filter(vaccine_course_id.eq(course_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
