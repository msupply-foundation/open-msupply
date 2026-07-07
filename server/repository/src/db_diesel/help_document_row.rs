use super::{ChangelogRepository, StorageConnection};
use crate::{
    repository_error::RepositoryError, ChangelogSyncType, RowActionType, SourceSiteId, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    help_document (id) {
        id -> Text,
        title -> Text,
        created_datetime -> Timestamp,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Serialize, Deserialize, Default,
)]
#[diesel(table_name = help_document)]
pub struct HelpDocumentRow {
    pub id: String,
    pub title: String,
    pub created_datetime: NaiveDateTime,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct HelpDocumentRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> HelpDocumentRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        HelpDocumentRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &HelpDocumentRow) -> Result<(), RepositoryError> {
        diesel::insert_into(help_document::table)
            .values(row)
            .on_conflict(help_document::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &HelpDocumentRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = HelpDocumentRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<HelpDocumentRow>, RepositoryError> {
        let result = help_document::table
            .filter(help_document::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<HelpDocumentRow>, RepositoryError> {
        Ok(help_document::table
            .filter(help_document::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn mark_deleted(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::update(help_document::table.filter(help_document::id.eq(id)))
            .set(help_document::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        // Soft delete propagates as an Upsert changelog so remotes see the new
        // `deleted_datetime` value and stop listing the row.
        let changelog = HelpDocumentRow::generate_changelog(
            id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for HelpDocumentRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        HelpDocumentRowRepository::new(con)._upsert_one(self)?;
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
            HelpDocumentRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
