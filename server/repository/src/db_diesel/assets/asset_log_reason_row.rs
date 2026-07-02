use super::asset_log_reason_row::asset_log_reason::dsl::*;

use crate::asset_log_row::AssetLogStatus;
use crate::ChangelogRepository;
use crate::RepositoryError;
use crate::RowActionType;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogSyncType, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    asset_log_reason (id) {
        id -> Text,
        asset_log_status -> crate::db_diesel::assets::asset_log_row::AssetLogStatusMapping,
        reason -> Text,
        deleted_datetime -> Nullable<Timestamp>,
        comments_required -> Bool,
    }
}

#[derive(
    Clone, Insertable, Queryable, Default, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = asset_log_reason)]
pub struct AssetLogReasonRow {
    pub id: String,
    pub asset_log_status: AssetLogStatus,
    pub reason: String,
    pub deleted_datetime: Option<NaiveDateTime>,
    pub comments_required: bool,
}
pub struct AssetLogReasonRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetLogReasonRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetLogReasonRowRepository { connection }
    }

    pub fn _upsert_one(
        &self,
        asset_log_reason_row: &AssetLogReasonRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_log_reason)
            .values(asset_log_reason_row)
            .on_conflict(id)
            .do_update()
            .set(asset_log_reason_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_log_reason_row: &AssetLogReasonRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(asset_log_reason_row)?;
        let changelog = AssetLogReasonRow::generate_changelog(
            asset_log_reason_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<AssetLogReasonRow>, RepositoryError> {
        let result = asset_log_reason.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_log_id: &str,
    ) -> Result<Option<AssetLogReasonRow>, RepositoryError> {
        let result = asset_log_reason
            .filter(id.eq(asset_log_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_log_reason_id: &str) -> Result<(), RepositoryError> {
        diesel::update(asset_log_reason.filter(id.eq(asset_log_reason_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        let changelog = AssetLogReasonRow::generate_changelog(
            asset_log_reason_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetLogReasonRow>, RepositoryError> {
        Ok(asset_log_reason::table
            .filter(asset_log_reason::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for AssetLogReasonRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AssetLogReasonRowRepository::new(con)._upsert_one(self)?;
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
            AssetLogReasonRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
