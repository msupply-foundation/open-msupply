use super::asset_log_reason_row::asset_log_reason::dsl::*;

use crate::asset_log_row::AssetLogStatus;
use crate::ChangeLogInsertRow;
use crate::ChangelogAction;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;

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
    pub fn _upsert_one(&self, asset_log_row: &AssetLogReasonRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_log_reason)
            .values(asset_log_reason_row)
            .on_conflict(id)
            .do_update()
            .set(asset_log_reason_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(
        &self,
        asset_log_reason_row: &AssetLogReasonRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_log_reason)
            .values(asset_log_reason_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_log_reason_row: &AssetLogReasonRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_log_reason_row)?;
        // Return the changelog id
        self.insert_changelog(asset_log_reason_row.id.to_owned(), ChangelogAction::Upsert)
    }

    fn insert_changelog(
        &self,
        asset_log_id: String,
        action: ChangelogAction,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetLogReason,
            record_id: asset_log_id,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
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

        let _cursor_id =
            self.insert_changelog(asset_log_reason_id.to_owned(), ChangelogAction::Delete);
        Ok(())
    }
}

impl Upsert for AssetLogReasonRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _cursor_id = AssetLogReasonRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        // We'll return the later changelog id, as that's the one that will be marked as coming from this site...
        let cursor_id = AssetLogReasonRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetLogReasonRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
