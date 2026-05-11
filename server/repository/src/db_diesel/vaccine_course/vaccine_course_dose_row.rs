use super::{
    vaccine_course_dose_row::vaccine_course_dose::dsl::*, vaccine_course_row::vaccine_course,
};

use crate::{
    db_diesel::{
        clinician_link_row::clinician_link, clinician_row::clinician, item_link_row::item_link,
        item_row::item, name_row::name,
    }, ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    vaccine_course_dose (id) {
        id -> Text,
        vaccine_course_id -> Text,
        label -> Text,
        min_age -> Double,
        max_age -> Double,
        custom_age_label -> Nullable<Text>,
        min_interval_days -> Integer,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

joinable!(vaccine_course_dose -> vaccine_course (vaccine_course_id));
allow_tables_to_appear_in_same_query!(vaccine_course_dose, vaccine_course);
allow_tables_to_appear_in_same_query!(vaccine_course_dose, clinician_link);
allow_tables_to_appear_in_same_query!(vaccine_course_dose, clinician);
allow_tables_to_appear_in_same_query!(vaccine_course_dose, name);
allow_tables_to_appear_in_same_query!(vaccine_course_dose, item_link);
allow_tables_to_appear_in_same_query!(vaccine_course_dose, item);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = vaccine_course_dose)]
pub struct VaccineCourseDoseRow {
    pub id: String,
    pub vaccine_course_id: String,
    pub label: String,
    pub min_age: f64,
    pub max_age: f64,
    pub custom_age_label: Option<String>,
    pub min_interval_days: i32,
    pub deleted_datetime: Option<NaiveDateTime>,
}
pub struct VaccineCourseDoseRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseDoseRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseDoseRowRepository { connection }
    }

    pub fn _upsert_one(
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

    pub fn upsert_one(
        &self,
        vaccine_course_dose_row: &VaccineCourseDoseRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(vaccine_course_dose_row)?;
        let changelog = VaccineCourseDoseRow::generate_changelog(
            vaccine_course_dose_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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

    pub fn mark_deleted(&self, vaccine_course_dose_id: &str) -> Result<(), RepositoryError> {
        diesel::update(vaccine_course_dose.filter(id.eq(vaccine_course_dose_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        let changelog = VaccineCourseDoseRow::generate_changelog(
            vaccine_course_dose_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<VaccineCourseDoseRow>, RepositoryError> {
        Ok(vaccine_course_dose::table
            .filter(vaccine_course_dose::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for VaccineCourseDoseRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        VaccineCourseDoseRowRepository::new(con)._upsert_one(self)?;

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
            VaccineCourseDoseRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
