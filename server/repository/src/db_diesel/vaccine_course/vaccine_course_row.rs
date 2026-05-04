use super::vaccine_course_row::vaccine_course::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::{
    ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
};

use diesel::prelude::*;

table! {
    vaccine_course (id) {
        id -> Text,
        name -> Text,
        program_id -> Text,
        demographic_id -> Nullable<Text>,
        coverage_rate -> Double,
        use_in_gaps_calculations -> Bool,
        wastage_rate -> Double,
        deleted_datetime -> Nullable<Timestamp>,
        can_skip_dose -> Bool
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Serialize, Deserialize, Default,
)]
#[diesel(table_name = vaccine_course)]
#[diesel(treat_none_as_null = true)]
pub struct VaccineCourseRow {
    pub id: String,
    pub name: String,
    pub program_id: String,
    pub demographic_id: Option<String>,
    pub coverage_rate: f64,
    #[serde(rename = "is_active")] // To prevent breaking change in v6 sync API
    pub use_in_gaps_calculations: bool,
    pub wastage_rate: f64,
    pub deleted_datetime: Option<chrono::NaiveDateTime>,
    pub can_skip_dose: bool,
}
pub struct VaccineCourseRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseRowRepository { connection }
    }

    pub fn _upsert_one(
        &self,
        vaccine_course_row: &VaccineCourseRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(vaccine_course)
            .values(vaccine_course_row)
            .on_conflict(id)
            .do_update()
            .set(vaccine_course_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        vaccine_course_row: &VaccineCourseRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(vaccine_course_row)?;
        let changelog = VaccineCourseRow::generate_changelog(
            vaccine_course_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&mut self) -> Result<Vec<VaccineCourseRow>, RepositoryError> {
        let result = vaccine_course.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        vaccine_course_id: &str,
    ) -> Result<Option<VaccineCourseRow>, RepositoryError> {
        let result = vaccine_course
            .filter(id.eq(vaccine_course_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, vaccine_course_id: &str) -> Result<(), RepositoryError> {
        diesel::update(vaccine_course.filter(id.eq(vaccine_course_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<VaccineCourseRow>, RepositoryError> {
        Ok(vaccine_course::table
            .filter(vaccine_course::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for VaccineCourseRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        VaccineCourseRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VaccineCourseRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
