use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, StorageConnection, Upsert,
};

use diesel::prelude::*;

table! {
    period_schedule (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = period_schedule)]
pub struct PeriodScheduleRow {
    pub id: String,
    pub name: String,
}

pub struct PeriodScheduleRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PeriodScheduleRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PeriodScheduleRowRepository { connection }
    }

    fn _upsert_one(&self, row: &PeriodScheduleRow) -> Result<(), RepositoryError> {
        diesel::insert_into(period_schedule::table)
            .values(row)
            .on_conflict(period_schedule::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PeriodScheduleRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PeriodScheduleRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<PeriodScheduleRow>, RepositoryError> {
        let result = period_schedule::table
            .filter(period_schedule::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<PeriodScheduleRow>, RepositoryError> {
        Ok(period_schedule::table
            .filter(period_schedule::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_one_by_name(
        &self,
        name: &str,
    ) -> Result<Option<PeriodScheduleRow>, RepositoryError> {
        let result = period_schedule::table
            .filter(period_schedule::name.eq(name))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for PeriodScheduleRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PeriodScheduleRowRepository::new(con)._upsert_one(self)?;

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
            PeriodScheduleRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
