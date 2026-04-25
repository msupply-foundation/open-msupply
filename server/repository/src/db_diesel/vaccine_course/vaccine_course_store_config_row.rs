use super::vaccine_course_store_config_row::vaccine_course_store_config::dsl::*;
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
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

    pub fn upsert_one(&self, row: &VaccineCourseStoreConfigRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(vaccine_course_store_config)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(
            row.id.to_string(),
            RowActionType::Upsert,
            row.store_id.clone(),
        )
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
        changelog_store_id: String,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::VaccineCourseStoreConfig,
            record_id: row_id,
            row_action: action,
            store_id: Some(changelog_store_id),
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
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
    fn upsert(&self, con: &StorageConnection, _changelog: Option<ChangeLogInsertRow>) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = VaccineCourseStoreConfigRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VaccineCourseStoreConfigRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
