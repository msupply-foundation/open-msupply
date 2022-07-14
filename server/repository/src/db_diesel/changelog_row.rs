use diesel::prelude::*;

use super::{changelog_row::changelog_deduped::dsl as changelog_deduped_dsl, StorageConnection};

use crate::RepositoryError;
use std::convert::TryInto;

use diesel_derive_enum::DbEnum;

table! {
    changelog (id) {
        id -> BigInt,
        table_name -> crate::db_diesel::changelog_row::ChangelogTableNameMapping,
        row_id -> Text,
        row_action -> crate::db_diesel::changelog_row::ChangelogActionMapping,
    }
}

table! {
    changelog_deduped (id) {
        id -> BigInt,
        table_name -> crate::db_diesel::changelog_row::ChangelogTableNameMapping,
        row_id -> Text,
        row_action -> crate::db_diesel::changelog_row::ChangelogActionMapping,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ChangelogAction {
    Upsert,
    Delete,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "snake_case"]
pub enum ChangelogTableName {
    Number,
    Location,
    StockLine,
    Name,
    NameStoreJoin,
    Invoice,
    InvoiceLine,
    Stocktake,
    StocktakeLine,
    Requisition,
    RequisitionLine,
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct ChangelogRow {
    pub id: i64,
    pub table_name: ChangelogTableName,
    pub row_id: String,
    pub row_action: ChangelogAction,
}

pub struct ChangelogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ChangelogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ChangelogRowRepository { connection }
    }

    /// # Arguments:
    /// * earliest the first cursor to be included in the returned
    /// * limit the number of entries to be returned
    pub fn changelogs(
        &self,
        earliest: u64,
        limit: u32,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let final_query = changelog_deduped_dsl::changelog_deduped
            .filter(changelog_deduped_dsl::id.ge(earliest.try_into().unwrap_or(0)))
            .limit(limit.into());

        // // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn count(&self, earliest: u64) -> Result<u64, RepositoryError> {
        let result = changelog_deduped_dsl::changelog_deduped
            .filter(changelog_deduped_dsl::id.ge(earliest.try_into().unwrap_or(0)))
            .count()
            .get_result::<i64>(&self.connection.connection)?;
        Ok(result as u64)
    }

    pub fn latest_changelog(&self) -> Result<Option<ChangelogRow>, RepositoryError> {
        let result = changelog_deduped_dsl::changelog_deduped
            .order(changelog_deduped_dsl::id.desc())
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
