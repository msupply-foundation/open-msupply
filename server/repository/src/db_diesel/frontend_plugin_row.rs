use super::{
    ChangelogRepository, RowActionType, StorageConnection,
};

use crate::{
    repository_error::RepositoryError, ChangelogSyncType, Delete, SourceSiteId, Upsert,
};
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

/// The plugin host runtime a bundle targets — which component runtime its
/// contributions are written against (`react`, `solid`, ...).
///
/// The server never interprets the value: discovery compares it for exact
/// equality against the runtime the asking client declares
/// (`get_frontend_plugins_metadata`). That is deliberate — a new host can be
/// introduced, and its bundles served, without a server release teaching the
/// server its name.
///
/// It is a separate field from [`FrontendPluginRow::plugin_api_version`]
/// because the API integer is only meaningful *within* a runtime: `1` means one
/// thing to the SolidJS host and would mean something else entirely to a
/// hypothetical plain-JavaScript one. Runtime picks the number line; the
/// integer positions the bundle on it.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct HostRuntime(pub String);

/// The runtime of every bundle that predates the column: the React
/// module-federation UI served at `/old-ui/`.
pub const LEGACY_HOST_RUNTIME: &str = "react";

/// The plugin API of every bundle that predates the column — "before the
/// contract existed". The React bundles have no plugin-API contract at all, and
/// `0` is how that era is spelled now that the column is NOT NULL.
///
/// Frozen, along with [`LEGACY_HOST_RUNTIME`]: no bundle is ever issued at API
/// `0` again, and every runtime introduced from here on declares a real
/// integer. That is what keeps `(runtime, plugin_api_version)` a total
/// description of a bundle's host compatibility, with no arm meaning "legacy".
pub const LEGACY_PLUGIN_API_VERSION: i32 = 0;

impl Default for HostRuntime {
    fn default() -> Self {
        Self(LEGACY_HOST_RUNTIME.to_string())
    }
}

impl From<String> for HostRuntime {
    fn from(value: String) -> Self {
        Self(value)
    }
}

impl From<HostRuntime> for String {
    fn from(value: HostRuntime) -> Self {
        value.0
    }
}

fn legacy_plugin_api_version() -> i32 {
    LEGACY_PLUGIN_API_VERSION
}

table! {
  frontend_plugin (id) {
      id -> Text,
      code -> Text,
      version -> Text,
      entry_point -> Text,
      types -> Text,
      files -> Text,
      host_runtime -> Text,
      plugin_api_version -> Integer,
  }
}

#[derive(
    Clone, Insertable, Default, Queryable, Debug, PartialEq, Eq, AsChangeset, Serialize, Deserialize,
)]
#[diesel(table_name = frontend_plugin)]
pub struct FrontendPluginRow {
    pub id: String,
    pub code: String,
    pub version: String,
    pub entry_point: String,
    #[diesel(serialize_as = String)]
    #[diesel(deserialize_as = String)]
    pub types: FrontendPluginTypes,
    #[diesel(serialize_as = String)]
    #[diesel(deserialize_as = String)]
    pub files: FrontendPluginFiles,
    /// Which front end can load this bundle. See [`HostRuntime`].
    ///
    /// The serde default is what keeps sync backwards compatible: a row pushed
    /// by a central that predates the field arrives without it, and every such
    /// row is by construction a React bundle — the field is introduced before
    /// any bundle for another runtime can exist.
    #[diesel(serialize_as = String)]
    #[diesel(deserialize_as = String)]
    #[serde(default)]
    pub host_runtime: HostRuntime,
    /// Where on `host_runtime`'s plugin-API number line this bundle sits — the
    /// same integer the host's own loader gates on. Compared against the pair
    /// the asking client declares (`get_frontend_plugins_metadata`).
    ///
    /// Defaults to [`LEGACY_PLUGIN_API_VERSION`] for the same reason as
    /// `host_runtime`, and for rows that predate the field the two defaults
    /// agree: `react` at API `0`.
    #[serde(default = "legacy_plugin_api_version")]
    pub plugin_api_version: i32,
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

    pub fn _upsert_one(&self, row: &FrontendPluginRow) -> Result<(), RepositoryError> {
        diesel::insert_into(frontend_plugin::table)
            .values(row.clone())
            .on_conflict(frontend_plugin::id)
            .do_update()
            .set(row.clone())
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: FrontendPluginRow) -> Result<(), RepositoryError> {
        self._upsert_one(&row)?;
        let changelog = FrontendPluginRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        let changelog = FrontendPluginRow::generate_changelog(
            id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(frontend_plugin::table.filter(frontend_plugin::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<FrontendPluginRow>, RepositoryError> {
        Ok(frontend_plugin::table
            .filter(frontend_plugin::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for FrontendPluginRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        FrontendPluginRowRepository::new(con)._upsert_one(self)?;
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
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => FrontendPluginRow::generate_changelog(
                self.0.clone(),
                con,
                RowActionType::Delete,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(frontend_plugin::table.filter(frontend_plugin::id.eq(&self.0)))
            .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            FrontendPluginRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
