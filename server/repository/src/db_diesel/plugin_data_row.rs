use super::{store_row::store, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    plugin_data (id) {
        id -> Text,
        plugin_name -> Text,
        related_record_id -> Text,
        related_record_type -> crate::db_diesel::plugin_data_row::RelatedRecordTypeMapping,
        store_id -> Text,
        data -> Text,
    }
}

joinable!(plugin_data -> store (store_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RelatedRecordType {
    StockLine,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "plugin_data"]
pub struct PluginDataRow {
    pub id: String,
    pub plugin_name: String,
    pub related_record_id: String,
    pub related_record_type: RelatedRecordType,
    pub store_id: String,
    pub data: String,
}

pub struct PluginDataRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PluginDataRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PluginDataRowRepository { connection }
    }

    pub fn insert_one(&self, row: &PluginDataRow) -> Result<(), RepositoryError> {
        diesel::insert_into(plugin_data::table)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &PluginDataRow) -> Result<(), RepositoryError> {
        diesel::insert_into(plugin_data::table)
            .values(row)
            .on_conflict(plugin_data::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &PluginDataRow) -> Result<(), RepositoryError> {
        diesel::replace_into(plugin_data::table)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<PluginDataRow>, RepositoryError> {
        let result: Option<PluginDataRow> = plugin_data::table
            .filter(plugin_data::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;

        Ok(result)
    }
}
