use diesel::prelude::*;

use crate::{
    schema::{diesel_schema::changelog_deduped::dsl as changelog_deduped_dsl, ChangelogRow},
    RepositoryError, StorageConnection,
};
use std::convert::TryInto;

pub struct ChangelogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ChangelogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ChangelogRowRepository { connection }
    }

    /// # Arguments:
    /// * earliest the first cursor to be included in the returned
    /// * count the number of entries to be returned
    pub fn changelogs(
        &self,
        earliest: u64,
        count: u32,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let result = changelog_deduped_dsl::changelog_deduped
            .filter(changelog_deduped_dsl::id.ge(earliest.try_into().unwrap_or(0)))
            .limit(count.into())
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn latest_changelog(&self) -> Result<Option<ChangelogRow>, RepositoryError> {
        let result = changelog_deduped_dsl::changelog_deduped
            .order(changelog_deduped_dsl::id.desc())
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
