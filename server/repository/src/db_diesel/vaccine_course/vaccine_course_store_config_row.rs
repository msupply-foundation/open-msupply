use super::vaccine_course_store_config_row::vaccine_course_store_config::dsl::*;
use crate::{
    ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    vaccine_course_store_config (id) {
        id -> Text,
        vaccine_course_id -> Text,
        store_id -> Text,
        wastage_rate -> Nullable<Double>,
        coverage_rate -> Nullable<Double>,
    }
}

#[derive(
    Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default, Deserialize, Serialize,
)]
#[diesel(table_name = vaccine_course_store_config)]
#[diesel(treat_none_as_null = true)]
pub struct VaccineCourseStoreConfigRow {
    pub id: String,
    pub vaccine_course_id: String,
    pub store_id: String,
    pub wastage_rate: Option<f64>,
    pub coverage_rate: Option<f64>,
}
pub struct VaccineCourseStoreConfigRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseStoreConfigRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseStoreConfigRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &VaccineCourseStoreConfigRow) -> Result<(), RepositoryError> {
        diesel::insert_into(vaccine_course_store_config)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &VaccineCourseStoreConfigRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<VaccineCourseStoreConfigRow>, RepositoryError> {
        let result = vaccine_course_store_config
            .filter(id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<VaccineCourseStoreConfigRow>, RepositoryError> {
        Ok(vaccine_course_store_config::table
            .filter(vaccine_course_store_config::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for VaccineCourseStoreConfigRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        VaccineCourseStoreConfigRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.generate_changelog(
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
            VaccineCourseStoreConfigRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
