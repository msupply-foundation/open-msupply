use super::StorageConnection;

use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
};

use diesel::prelude::*;
use serde::Serialize;

table! {
    demographic_projection(id) {
        id -> Text,
        base_year -> Integer,
        year_1 -> Double,
        year_2 -> Double,
        year_3 -> Double,
        year_4 -> Double,
        year_5 -> Double,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize)]
#[diesel(table_name = demographic_projection)]
pub struct DemographicProjectionRow {
    pub id: String,
    pub base_year: i32,
    pub year_1: f64,
    pub year_2: f64,
    pub year_3: f64,
    pub year_4: f64,
    pub year_5: f64,
}

pub struct DemographicProjectionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicProjectionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicProjectionRowRepository { connection }
    }

    fn _upsert_one(&self, row: &DemographicProjectionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(demographic_projection::table)
            .values(row)
            .on_conflict(demographic_projection::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &DemographicProjectionRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = DemographicProjectionRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        demographic_projection_id: &str,
    ) -> Result<Option<DemographicProjectionRow>, RepositoryError> {
        let result = demographic_projection::table
            .filter(demographic_projection::id.eq(demographic_projection_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<DemographicProjectionRow>, RepositoryError> {
        Ok(demographic_projection::table
            .filter(demographic_projection::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for DemographicProjectionRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        DemographicProjectionRowRepository::new(con)._upsert_one(self)?;

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
            DemographicProjectionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
