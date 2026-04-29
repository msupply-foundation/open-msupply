use super::{
    store_row::store, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    KeyValueStoreRepository, RowActionType, StorageConnection,
};

use crate::{repository_error::RepositoryError, ChangelogSyncType, Upsert};

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
}

impl PluginDataRow {
    pub fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PluginData,
            record_id: self.id.clone(),
            row_action: action,
            store_id: self.store_id.clone(),
            name_id: None,
            source_site_id: KeyValueStoreRepository::new(con).get_source_site_id(source_site_id)?,
            ..Default::default()
        })
    }
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

    pub fn upsert_one(&self, row: &PluginDataRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.changelog(self.connection, RowActionType::Upsert, None)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<PluginDataRow>, RepositoryError> {
        let result: Option<PluginDataRow> = plugin_data::table
            .filter(plugin_data::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;

        Ok(result)
    }
}

impl Upsert for PluginDataRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        PluginDataRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                self.changelog(con, RowActionType::Upsert, source_site_id)?
            }
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
