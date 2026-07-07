use super::abbreviation_row::abbreviation::dsl::*;
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
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

    fn _upsert_one(&self, row: &AbbreviationRow) -> Result<(), RepositoryError> {
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

impl Upsert for AbbreviationRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AbbreviationRowRepository::new(con)._upsert_one(self)?;

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
            AbbreviationRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct AbbreviationRowDelete(pub String);
impl Delete for AbbreviationRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = AbbreviationRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                AbbreviationRow::generate_changelog(
                    self.0.clone(),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            AbbreviationRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
