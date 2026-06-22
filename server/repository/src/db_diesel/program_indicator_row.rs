use super::StorageConnection;

use crate::{
    diesel_macros::define_batch_table, repository_error::RepositoryError, ChangelogRepository,
    RowActionType, SourceSiteId,
};

use diesel::prelude::*;

define_batch_table! {
    struct: ProgramIndicatorRow,
    repo: ProgramIndicatorRowRepository,
    table: program_indicator (id) {
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

    pub(crate) fn _upsert_one(&self, row: &ProgramIndicatorRow) -> Result<(), RepositoryError> {
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
