use super::{store_row::store, ChangelogRepository, RowActionType, StorageConnection};

use crate::{repository_error::RepositoryError, ChangelogSyncType, Delete, SourceSiteId, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

table! {
    plugin_data (id) {
        id -> Text,
        store_id -> Nullable<Text>,
        plugin_code -> Text,
        related_record_id -> Nullable<Text>,
        data_identifier -> Text,
        data -> Text,
        datetime -> Nullable<Timestamp>,
    }
}

joinable!(plugin_data -> store (store_id));

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Serialize, Deserialize, TS,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = plugin_data)]
pub struct PluginDataRow {
    pub id: String,
    pub store_id: Option<String>, // Any data without a store_id will be considered global data and synced to all stores
    pub plugin_code: String,
    pub related_record_id: Option<String>,
    pub data_identifier: String, // Used by the plugin to identify the data, often would be a table name
    pub data: String,
    /// Optional, plugin-controlled timestamp (e.g. "update time"). Kept as a
    /// distinct column to allow efficient filtering by date range.
    #[serde(default)]
    pub datetime: Option<NaiveDateTime>,
}
pub struct PluginDataRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PluginDataRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PluginDataRowRepository { connection }
    }

    fn _upsert_one(&self, row: &PluginDataRow) -> Result<(), RepositoryError> {
        diesel::insert_into(plugin_data::table)
            .values(row)
            .on_conflict(plugin_data::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PluginDataRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<PluginDataRow>, RepositoryError> {
        let result: Option<PluginDataRow> = plugin_data::table
            .filter(plugin_data::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;

        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<PluginDataRow>, RepositoryError> {
        Ok(plugin_data::table
            .filter(plugin_data::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(plugin_data::table.filter(plugin_data::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Delete the row and write a Delete changelog. `store_id` is supplied by the
    /// caller (looked up before delete) so the delete changelog is routed to the
    /// same sites the upsert was synced to.
    pub fn delete(&self, id: &str, store_id: Option<String>) -> Result<(), RepositoryError> {
        let changelog = PluginDataRow {
            id: id.to_string(),
            store_id,
            plugin_code: String::new(),
            related_record_id: None,
            data_identifier: String::new(),
            data: String::new(),
            datetime: None,
        }
        .generate_changelog(
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        self._delete(id)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl Upsert for PluginDataRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PluginDataRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.generate_changelog(
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
            PluginDataRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct PluginDataRowDelete(pub String);
impl Delete for PluginDataRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = PluginDataRowRepository::new(con);

        // Build changelog BEFORE deleting. For the V5V6 sync type the changelog is
        // generated from the existing row so that the delete's store_id matches the
        // upsert's, routing the delete to the same sites the upsert was synced to.
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                let existing_row = repo.find_one_by_id(&self.0)?;
                let store_id = existing_row.and_then(|row| row.store_id);
                PluginDataRow {
                    id: self.0.clone(),
                    store_id,
                    plugin_code: String::new(),
                    related_record_id: None,
                    data_identifier: String::new(),
                    data: String::new(),
                    datetime: None,
                }
                .generate_changelog(
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
            PluginDataRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
