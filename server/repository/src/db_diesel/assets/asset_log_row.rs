use super::asset_log_row::asset_log::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    asset_log (id) {
        id -> Text,
        asset_id -> Text,
        user_id -> Text,
        status -> Nullable<Text>,
        comment -> Nullable<Text>,
        #[sql_name = "type"] type_ -> Nullable<Text>,
        reason -> Nullable<Text>,
        log_datetime -> Timestamp,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[table_name = "asset_log"]

pub struct AssetLogRow {
    pub id: String,
    pub asset_id: String,
    pub user_id: String,
    pub status: Option<String>,
    pub comment: Option<String>,
    #[column_name = "type_"]
    pub r#type: Option<String>,
    pub reason: Option<String>,
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
