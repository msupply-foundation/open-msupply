use super::vaccine_course_dose_row::vaccine_course_dose::dsl::*;

use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    vaccine_course_dose (id) {
        id -> Text,
        vaccine_course_id -> Text,
        label -> Text,
        min_age -> Double,
        min_interval_days -> Integer,

    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default, Serialize, Deserialize,
)]
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
    ) -> Result<i64, RepositoryError> {
        diesel::insert_into(vaccine_course_dose)
            .values(vaccine_course_dose_row)
            .on_conflict(id)
            .do_update()
            .set(vaccine_course_dose_row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(vaccine_course_dose_row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::VaccineCourseDose,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
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

impl Upsert for VaccineCourseDoseRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = VaccineCourseDoseRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VaccineCourseDoseRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
