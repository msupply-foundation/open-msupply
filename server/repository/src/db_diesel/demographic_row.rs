use super::StorageConnection;

use crate::{
    ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, Upsert,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    demographic(id) {
        id -> Text,
        name -> Text,
        population_percentage -> Double
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = demographic)]
pub struct DemographicRow {
    pub id: String,
    pub name: String,
    pub population_percentage: f64,
}
pub struct DemographicRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &DemographicRow) -> Result<(), RepositoryError> {
        diesel::insert_into(demographic::table)
            .values(row)
            .on_conflict(demographic::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &DemographicRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = DemographicRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        demographic_id: &str,
    ) -> Result<Option<DemographicRow>, RepositoryError> {
        let result = demographic::table
            .filter(demographic::id.eq(demographic_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_name(
        &self,
        demographic_name: &str,
    ) -> Result<Option<DemographicRow>, RepositoryError> {
        let result = demographic::table
            .filter(demographic::name.eq(demographic_name))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<DemographicRow>, RepositoryError> {
        Ok(demographic::table
            .filter(demographic::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for DemographicRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        DemographicRowRepository::new(con)._upsert_one(self)?;
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
            DemographicRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
