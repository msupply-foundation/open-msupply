use super::vaccine_course_item_row::vaccine_course_item::dsl::*;
use crate::db_diesel::item_link_row::item_link;
use crate::db_diesel::item_row::item as item_dsl;
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

joinable!(vaccine_course_item -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(vaccine_course_item, item_link);
allow_tables_to_appear_in_same_query!(vaccine_course_item, item_dsl);

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default)]
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

    pub fn delete_by_vaccine_course_id(&self, course_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(vaccine_course_item)
            .filter(vaccine_course_id.eq(course_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
