use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert, db_diesel::changelog::changelog::RowOrId,
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

    pub fn upsert_one(&self, preference_row: &PreferenceRow) -> Result<(), RepositoryError> {
        self._upsert_one(preference_row)?;
        let changelog = PreferenceRow::generate_changelog(
            RowOrId::Row(preference_row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
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

    /// Serialise read-modify-write updates of one preference for the rest of
    /// the current transaction, so two concurrent edits of a map-valued
    /// preference can't each read the old value and overwrite the other's
    /// change. Works whether or not the row exists yet, which a row lock
    /// (`SELECT ... FOR UPDATE`) wouldn't: the first save has no row to lock.
    // feature postgres
    #[cfg(feature = "postgres")]
    pub fn lock_for_update(&self, preference_id: &str) -> Result<(), RepositoryError> {
        // Released when the transaction ends; a second caller blocks until
        // then and reads the committed value.
        diesel::sql_query("SELECT pg_advisory_xact_lock(hashtext($1))")
            .bind::<diesel::sql_types::Text, _>(preference_id)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    // feature sqlite
    // SQLite allows only a single write transaction at a time (transactions are
    // opened with `BEGIN IMMEDIATE`), so writers are already serialised.
    #[cfg(not(feature = "postgres"))]
    pub fn lock_for_update(&self, _preference_id: &str) -> Result<(), RepositoryError> {
        Ok(())
    }

    pub fn delete(&self, preference_id: &str) -> Result<(), RepositoryError> {
        let changelog = PreferenceRow::generate_changelog(
            RowOrId::Id(preference_id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(preference.filter(preference::id.eq(preference_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<PreferenceRow>, RepositoryError> {
        Ok(preference::table
            .filter(preference::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
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
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                PreferenceRow::generate_changelog(
                    RowOrId::Row(self),
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
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
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                PreferenceRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
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
