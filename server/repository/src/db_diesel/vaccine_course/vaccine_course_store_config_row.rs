use super::vaccine_course_store_config_row::vaccine_course_store_config::dsl::*;
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogSyncType, ChangelogTableName,
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

impl VaccineCourseStoreConfigRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::VaccineCourseStoreConfig,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
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

    pub fn upsert_one(&self, row: &VaccineCourseStoreConfigRow) -> Result<i64, RepositoryError> {
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
