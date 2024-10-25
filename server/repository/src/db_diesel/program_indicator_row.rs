use super::StorageConnection;

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;

table! {
    program_indicator (id) {
        id -> Text,
        program_id -> Text,
        code -> Nullable<Text>,
        is_active -> Bool,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
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

    pub fn upsert_one(&self, row: &ProgramIndicatorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(program_indicator::table)
            .values(row)
            .on_conflict(program_indicator::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
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
}

impl Upsert for ProgramIndicatorRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ProgramIndicatorRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ProgramIndicatorRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
