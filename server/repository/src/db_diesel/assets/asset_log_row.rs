use super::asset_log_row::asset_log::dsl::*;

use crate::asset_row::{asset, AssetRowRepository};
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
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
        #[sql_name = "type"] type_ -> Nullable<Text>,
        reason_id -> Nullable<Text>,
        log_datetime -> Timestamp,
    }
}

table! {
    latest_asset_log (id) {
        id -> Text,
        asset_id -> Text,
        user_id -> Text,
        status -> Nullable<crate::db_diesel::assets::asset_log_row::AssetLogStatusMapping>,
        comment -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Nullable<Text>,
        reason_id -> Nullable<Text>,
        log_datetime -> Timestamp,
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
    pub r#type: Option<String>,
    pub reason_id: Option<String>,
    pub log_datetime: NaiveDateTime,
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

    pub fn upsert_one(&self, asset_log_row: &AssetLogRow) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_log_row)?;
        // Return the changelog id
        self.insert_changelog(
            asset_log_row.id.to_owned(),
            RowActionType::Upsert,
            Some(asset_log_row.clone()),
        )
    }

    fn insert_changelog(
        &self,
        asset_log_id: String,
        action: RowActionType,
        row: Option<AssetLogRow>,
    ) -> Result<i64, RepositoryError> {
        let store_id = match &row {
            Some(r) => {
                // Find the asset, and get the store id for that asset
                let asset = AssetRowRepository::new(self.connection).find_one_by_id(&r.asset_id)?;
                match asset {
                    Some(a) => a.store_id,
                    None => None,
                }
            }
            None => None,
        };
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetLog,
            record_id: asset_log_id,
            row_action: action,
            store_id,
            ..Default::default()
        };

        ChangelogRepository::new(self.connection).insert(&row)
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
}

impl Upsert for AssetLogRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        // We'll return the later changelog id, as that's the one that will be marked as coming from this site...
        let cursor_id = AssetLogRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetLogRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
