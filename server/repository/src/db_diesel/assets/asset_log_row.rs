use super::asset_log_row::asset_log::dsl::*;

use crate::EqualFilter;
use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;

use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    asset_log (id) {
        id -> Text,
        asset_id -> Text,
        user_id -> Text,
        status -> Nullable<crate::db_diesel::assets::asset_log_row::StatusMapping>,
        comment -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Nullable<Text>,
        reason -> Nullable<crate::db_diesel::assets::asset_log_row::ReasonMapping>,
        log_datetime -> Timestamp,
    }
}

table! {
    latest_asset_log (id) {
        id -> Text,
        asset_id -> Text,
        user_id -> Text,
        status -> Nullable<crate::db_diesel::assets::asset_log_row::StatusMapping>,
        comment -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Nullable<Text>,
        reason -> Nullable<crate::db_diesel::assets::asset_log_row::ReasonMapping>,
        log_datetime -> Timestamp,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum Reason {
    AwaitingInstallation,
    Stored,
    OffsiteForRepairs,
    AwaitingDecomissioning,
    NeedsServicing,
    MultipleTemperatureBreaches,
    Unknown,
    NeedsSpareParts,
    LackOfPower,
    Functioning,
    Decomissioned,
}

impl Reason {
    pub fn equal_to(&self) -> EqualFilter<Reason> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
            equal_any_or_null: None,
            is_null: None,
        }
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum Status {
    NotInUse,
    Functioning,
    FunctioningButNeedsAttention,
    NotFunctioning,
    Decomissioned,
}

impl Status {
    pub fn equal_to(&self) -> EqualFilter<Status> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
            equal_any_or_null: None,
            is_null: None,
        }
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "asset_log"]
pub struct AssetLogRow {
    pub id: String,
    pub asset_id: String,
    pub user_id: String,
    pub status: Option<Status>,
    pub comment: Option<String>,
    #[column_name = "type_"]
    pub r#type: Option<String>,
    pub reason: Option<Reason>,
    pub log_datetime: NaiveDateTime,
}

pub struct AssetLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetLogRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, asset_log_row: &AssetLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_log)
            .values(asset_log_row)
            .on_conflict(id)
            .do_update()
            .set(asset_log_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, asset_log_row: &AssetLogRow) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_log)
            .values(asset_log_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(&self, asset_log_row: &AssetLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_log)
            .values(asset_log_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AssetLogRow>, RepositoryError> {
        let result = asset_log.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_log_id: &str,
    ) -> Result<Option<AssetLogRow>, RepositoryError> {
        let result = asset_log
            .filter(id.eq(asset_log_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}
