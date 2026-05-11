use super::asset_log_row::asset_log::dsl::*;

use crate::asset_row::asset;
use crate::{
    ChangelogRepository, ChangelogSyncType,
    RepositoryError, RowActionType, SourceSiteId, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;

use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    asset_log (id) {
        id -> Text,
        asset_id -> Text,
        user_id -> Text,
        status -> Nullable<crate::db_diesel::assets::asset_log_row::AssetLogStatusMapping>,
        comment -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Nullable<crate::db_diesel::assets::asset_log_row::AssetLogTypeMapping>,
        reason_id -> Nullable<Text>,
        log_datetime -> Timestamp,
        created_datetime -> Timestamp,
    }
}

table! {
    latest_asset_log (id) {
        id -> Text,
        asset_id -> Text,
        user_id -> Text,
        status -> Nullable<crate::db_diesel::assets::asset_log_row::AssetLogStatusMapping>,
        comment -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Nullable<crate::db_diesel::assets::asset_log_row::AssetLogTypeMapping>,
        reason_id -> Nullable<Text>,
        log_datetime -> Timestamp,
        created_datetime -> Timestamp,
    }
}

joinable!(latest_asset_log -> asset (asset_id));

#[derive(DbEnum, Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum AssetLogStatus {
    #[default]
    NotInUse,
    Functioning,
    FunctioningButNeedsAttention,
    NotFunctioning,
    Decommissioned,
    Unserviceable,
}

#[derive(DbEnum, Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum AssetLogType {
    #[default]
    StatusUpdate,
    TemperatureMapping,
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = asset_log)]
pub struct AssetLogRow {
    pub id: String,
    pub asset_id: String,
    pub user_id: String,
    pub status: Option<AssetLogStatus>,
    pub comment: Option<String>,
    #[diesel(column_name = "type_")]
    #[serde(default)]
    pub r#type: Option<AssetLogType>,
    pub reason_id: Option<String>,
    pub log_datetime: NaiveDateTime,
    #[serde(default)]
    pub created_datetime: NaiveDateTime,
}
pub struct AssetLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetLogRowRepository { connection }
    }

    pub fn _upsert_one(&self, asset_log_row: &AssetLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_log)
            .values(asset_log_row)
            .on_conflict(id)
            .do_update()
            .set(asset_log_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, asset_log_row: &AssetLogRow) -> Result<(), RepositoryError> {
        self._upsert_one(asset_log_row)?;
        let changelog = asset_log_row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetLogRow>, RepositoryError> {
        let result = asset_log.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_log_id: &str,
    ) -> Result<Option<AssetLogRow>, RepositoryError> {
        let result = asset_log
            .filter(id.eq(asset_log_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetLogRow>, RepositoryError> {
        Ok(asset_log::table
            .filter(asset_log::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for AssetLogRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AssetLogRowRepository::new(con)._upsert_one(self)?;
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
            AssetLogRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
