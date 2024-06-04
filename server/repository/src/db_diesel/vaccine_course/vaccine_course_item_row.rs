use super::vaccine_course_item_row::vaccine_course_item::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use diesel::prelude::*;

table! {
    vaccine_course_item (id) {
        id -> Text,
        vaccine_course_id -> Text,
        item_link_id -> Text,

    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = vaccine_course_item)]
pub struct VaccineCourseItemRow {
    pub id: String,
    pub vaccine_course_id: String,
    pub item_link_id: String,
}

pub struct VaccineCourseItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseItemRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        vaccine_course_item_row: &VaccineCourseItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(vaccine_course_item)
            .values(vaccine_course_item_row)
            .on_conflict(id)
            .do_update()
            .set(vaccine_course_item_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        vaccine_course_item_row: &VaccineCourseItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(vaccine_course_item)
            .values(vaccine_course_item_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<VaccineCourseItemRow>, RepositoryError> {
        let result = vaccine_course_item.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        vaccine_course_item_id: &str,
    ) -> Result<Option<VaccineCourseItemRow>, RepositoryError> {
        let result = vaccine_course_item
            .filter(id.eq(vaccine_course_item_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, vaccine_course_item_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vaccine_course_item)
            .filter(id.eq(vaccine_course_item_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
