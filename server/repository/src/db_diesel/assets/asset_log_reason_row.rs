use super::asset_log_row::asset_log::dsl::*;

use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    asset_log_reason (id) {
        id -> Text,
        asset_log_status -> Text,
        reason -> Text,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, Serialize, Deserialize,
)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "asset_log_reason"]

pub struct AssetLogReasonRow {
    pub id: String,
    pub asset_log_status: String,
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
        diesel::insert_into(aasset_log_reason)
            .values(asset_log_reason_row)
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

    pub fn delete(&self, asset_log_reason_id: &str) -> Result<(), RepositoryError> {
        diesel::update(asset_log_reason.filter(id.eq(asset_log_reason_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
