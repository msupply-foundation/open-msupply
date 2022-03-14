use super::StorageConnection;

use crate::{
    repository_error::RepositoryError,
    schema::report::{report::dsl as report_dsl, ReportRow},
};

use diesel::prelude::*;

pub struct ReportRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReportRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReportRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ReportRow>, RepositoryError> {
        let result = report_dsl::report
            .filter(report_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ReportRow) -> Result<(), RepositoryError> {
        diesel::insert_into(report_dsl::report)
            .values(row)
            .on_conflict(report_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ReportRow) -> Result<(), RepositoryError> {
        diesel::replace_into(report_dsl::report)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
