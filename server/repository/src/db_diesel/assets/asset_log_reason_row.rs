use super::asset_log_reason_row::asset_log_reason::dsl::*;

use crate::asset_log_row::AssetLogStatus;
use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    asset_log_reason (id) {
        id -> Text,
        asset_log_status -> crate::db_diesel::assets::asset_log_row::AssetLogStatusMapping,
        reason -> Text,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Default, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[table_name = "asset_log_reason"]
pub struct AssetLogReasonRow {
    pub id: String,
    pub asset_log_status: AssetLogStatus,
    pub reason: String,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct AssetLogReasonRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetLogReasonRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetLogReasonRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, asset_log_row: &AssetLogReasonRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_log_reason)
            .values(asset_log_reason_row)
            .on_conflict(id)
            .do_update()
            .set(asset_log_reason_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        asset_log_reason_row: &AssetLogReasonRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_log_reason)
            .values(asset_log_reason_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(
        &self,
        asset_log_reason_row: &AssetLogReasonRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_log_reason)
            .values(asset_log_reason_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AssetLogReasonRow>, RepositoryError> {
        let result = asset_log_reason.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_log_id: &str,
    ) -> Result<Option<AssetLogReasonRow>, RepositoryError> {
        let result = asset_log_reason
            .filter(id.eq(asset_log_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_log_reason_id: &str) -> Result<(), RepositoryError> {
        diesel::update(asset_log_reason.filter(id.eq(asset_log_reason_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
