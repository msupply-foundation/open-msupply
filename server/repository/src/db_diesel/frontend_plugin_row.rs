use super::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType, StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Eq, Debug, Clone)]
pub struct FrontendPluginFile {
    pub file_name: String,
    pub file_content_base64: String,
}

#[derive(Clone, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
pub struct FrontendPluginFiles(pub Vec<FrontendPluginFile>);

impl From<String> for FrontendPluginFiles {
    fn from(value: String) -> Self {
        serde_json::from_str(&value).unwrap_or_default()
    }
}

impl From<FrontendPluginFiles> for String {
    fn from(value: FrontendPluginFiles) -> Self {
        serde_json::to_string(&value).unwrap_or_default()
    }
}

#[derive(Clone, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
pub struct FrontendPluginTypes(pub Vec<String>);

impl From<String> for FrontendPluginTypes {
    fn from(value: String) -> Self {
        serde_json::from_str(&value).unwrap_or_default()
    }
}

impl From<FrontendPluginTypes> for String {
    fn from(value: FrontendPluginTypes) -> Self {
        serde_json::to_string(&value).unwrap_or_default()
    }
}

#[derive(DbEnum, Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[cfg_attr(test, derive(strum::EnumIter))]
pub enum FrontendPluginVariantType {
    #[default]
    BoaJs,
}

table! {
  frontend_plugin (id) {
      id -> Text,
      code -> Text,
      entry_point -> Text,
      types -> Text,
      files -> Text,
  }
}

#[derive(
    Clone, Insertable, Default, Queryable, Debug, PartialEq, Eq, AsChangeset, Serialize, Deserialize,
)]
#[diesel(table_name = frontend_plugin)]
pub struct FrontendPluginRow {
    pub id: String,
    pub code: String,
    pub entry_point: String,
    #[diesel(serialize_as = String)]
    #[diesel(deserialize_as = String)]
    pub types: FrontendPluginTypes,
    #[diesel(serialize_as = String)]
    #[diesel(deserialize_as = String)]
    pub files: FrontendPluginFiles,
}

pub struct FrontendPluginRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> FrontendPluginRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        FrontendPluginRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<FrontendPluginRow>, RepositoryError> {
        let result = frontend_plugin::table
            .filter(frontend_plugin::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn all(&self) -> Result<Vec<FrontendPluginRow>, RepositoryError> {
        let result = frontend_plugin::table
            .order_by(frontend_plugin::id)
            .load(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn upsert_one(&self, row: FrontendPluginRow) -> Result<i64, RepositoryError> {
        let id = row.id.clone();
        diesel::insert_into(frontend_plugin::table)
            .values(row.clone())
            .on_conflict(frontend_plugin::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::FrontendPlugin,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(id)?;
        let change_log_id = match old_row {
            Some(_) => self.insert_changelog(id, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };

        diesel::delete(frontend_plugin::table.filter(frontend_plugin::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }
}

impl Upsert for FrontendPluginRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = FrontendPluginRowRepository::new(con).upsert_one(self.clone())?;
        Ok(Some(change_log))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            FrontendPluginRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
// Most central data will be soft deleted (via upsert), and this trait will not be implemented
// frontend_plugins don't have referencial relations to any other tables so it's ok to delete as an example
pub struct FrontendPluginRowDelete(pub String);
impl Delete for FrontendPluginRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = FrontendPluginRowRepository::new(con).delete(&self.0)?;
        Ok(change_log_id)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            FrontendPluginRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
