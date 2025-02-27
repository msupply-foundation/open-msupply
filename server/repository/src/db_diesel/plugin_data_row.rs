use super::{
    store_row::store, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType,
    StorageConnection,
};

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;

use serde::{Deserialize, Serialize};

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

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Serialize, Deserialize)]
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

pub struct PluginDataRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PluginDataRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PluginDataRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PluginDataRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(plugin_data::table)
            .values(row)
            .on_conflict(plugin_data::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&row.id, row.store_id.clone(), RowActionType::Upsert)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<PluginDataRow>, RepositoryError> {
        let result: Option<PluginDataRow> = plugin_data::table
            .filter(plugin_data::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;

        Ok(result)
    }

    fn insert_changelog(
        &self,
        uid: &str,
        store_id: Option<String>,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PluginData,
            record_id: uid.to_string(),
            row_action: action,
            store_id,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }
}

impl Upsert for PluginDataRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = PluginDataRowRepository::new(con).upsert_one(&self)?;
        Ok(Some(change_log))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PluginDataRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
