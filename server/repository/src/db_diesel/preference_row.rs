use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogSyncType, ChangelogTableName, Delete,
    RepositoryError, RowActionType, SourceSiteIdForChangelog, StorageConnection, Upsert,
};

use super::preference_row::preference::dsl::*;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

table! {
    preference (id) {
        id -> Text,
        key -> Text,
        value -> Text,
        store_id -> Nullable<Text>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = preference)]
pub struct PreferenceRow {
    pub id: String,
    pub key: String,
    pub value: String,
    pub store_id: Option<String>,
}

impl PreferenceRow {
    pub(crate) fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteIdForChangelog,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Preference,
            record_id: self.id.clone(),
            row_action: action,
            store_id: self.store_id.clone(),
            name_id: None,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }

    pub(crate) fn delete_changelog(
        record_id: &str,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteIdForChangelog,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = PreferenceRowRepository::new(con)
            .find_one_by_id(record_id)?
            .ok_or(RepositoryError::NotFound)?;
        row.changelog(con, action, source_site_id)
    }
}

pub struct PreferenceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PreferenceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PreferenceRowRepository { connection }
    }

    fn _upsert_one(&self, preference_row: &PreferenceRow) -> Result<(), RepositoryError> {
        diesel::insert_into(preference::table)
            .values(preference_row)
            .on_conflict(id)
            .do_update()
            .set(preference_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, preference_row: &PreferenceRow) -> Result<i64, RepositoryError> {
        self._upsert_one(preference_row)?;
        let changelog = preference_row.changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteIdForChangelog::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_key(
        &self,
        preference_key: &str,
    ) -> Result<Option<PreferenceRow>, RepositoryError> {
        let result = preference
            .filter(key.eq(preference_key))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        preference_id: &str,
    ) -> Result<Option<PreferenceRow>, RepositoryError> {
        let result = preference::table
            .filter(preference::id.eq(preference_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, preference_id: &str) -> Result<Option<i64>, RepositoryError> {
        let changelog = PreferenceRow::delete_changelog(
            preference_id,
            self.connection,
            RowActionType::Delete,
            SourceSiteIdForChangelog::CurrentSiteId,
        )?;
        let change_log_id = ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(preference.filter(preference::id.eq(preference_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }
}

impl Upsert for PreferenceRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PreferenceRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.changelog(
                con,
                RowActionType::Upsert,
                SourceSiteIdForChangelog::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PreferenceRowRepository::new(con).find_one_by_key(&self.key),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct PreferenceRowDelete(pub String);
impl Delete for PreferenceRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => PreferenceRow::delete_changelog(
                &self.0,
                con,
                RowActionType::Delete,
                SourceSiteIdForChangelog::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(preference.filter(preference::id.eq(&self.0)))
            .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            PreferenceRowRepository::new(con).find_one_by_key(&self.0),
            Ok(None)
        )
    }
}
