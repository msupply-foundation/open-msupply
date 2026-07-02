use super::StorageConnection;

use crate::{
    repository_error::RepositoryError, ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
};

use diesel::prelude::*;

table! {
    program_indicator (id) {
        id -> Text,
        program_id -> Text,
        code -> Nullable<Text>,
        is_active -> Bool,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = program_indicator)]
pub struct ProgramIndicatorRow {
    pub id: String,
    pub program_id: String,
    pub code: Option<String>,
    pub is_active: bool,
}

pub struct ProgramIndicatorRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramIndicatorRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramIndicatorRowRepository { connection }
    }

    fn _upsert_one(&self, row: &ProgramIndicatorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_indicator::table)
            .values(row)
            .on_conflict(program_indicator::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ProgramIndicatorRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ProgramIndicatorRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<ProgramIndicatorRow>, RepositoryError> {
        let result = program_indicator::table
            .filter(program_indicator::id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ProgramIndicatorRow>, RepositoryError> {
        Ok(program_indicator::table
            .filter(program_indicator::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for ProgramIndicatorRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ProgramIndicatorRowRepository::new(con)._upsert_one(self)?;

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
            ProgramIndicatorRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
