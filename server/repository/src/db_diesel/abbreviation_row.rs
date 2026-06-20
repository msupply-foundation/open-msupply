use super::abbreviation_row::abbreviation::dsl::*;
use crate::{
    ChangelogRepository, RepositoryError, RowActionType, SourceSiteId, StorageConnection,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    abbreviation (id) {
        id -> Text,
        text -> Text,
        expansion -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = abbreviation)]
#[diesel(treat_none_as_null = true)]
pub struct AbbreviationRow {
    pub id: String,
    pub text: String,
    pub expansion: String,
}

pub struct AbbreviationRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AbbreviationRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AbbreviationRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &AbbreviationRow) -> Result<(), RepositoryError> {
        diesel::insert_into(abbreviation)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &AbbreviationRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = AbbreviationRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<AbbreviationRow>, RepositoryError> {
        let result = abbreviation.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        abbreviation_id: &str,
    ) -> Result<Option<AbbreviationRow>, RepositoryError> {
        let result = abbreviation
            .filter(id.eq(abbreviation_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AbbreviationRow>, RepositoryError> {
        Ok(abbreviation
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _delete(&self, abbreviation_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(abbreviation.filter(id.eq(abbreviation_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub(crate) fn delete_no_changelog(&self, record_id: &str) -> Result<(), RepositoryError> {
        self._delete(record_id)
    }

    pub fn delete(&self, abbreviation_id: &str) -> Result<(), RepositoryError> {
        self._delete(abbreviation_id)?;
        let changelog = AbbreviationRow::generate_changelog(
            abbreviation_id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}
