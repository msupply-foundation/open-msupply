use super::asset_class_row::asset_class::dsl::*;

use crate::RepositoryError;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogRepository, RowActionType};
use crate::{ChangelogSyncType, Upsert};

use diesel::prelude::*;
use serde::Deserialize;
use serde::Serialize;

table! {
    asset_class (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = asset_class)]
pub struct AssetClassRow {
    pub id: String,
    pub name: String,
}
pub struct AssetClassRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetClassRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetClassRowRepository { connection }
    }

    pub fn _upsert_one(&self, asset_class_row: &AssetClassRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_class)
            .values(asset_class_row)
            .on_conflict(id)
            .do_update()
            .set(asset_class_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, asset_class_row: &AssetClassRow) -> Result<(), RepositoryError> {
        self._upsert_one(asset_class_row)?;
        let changelog = AssetClassRow::generate_changelog(
            asset_class_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetClassRow>, RepositoryError> {
        let result = asset_class.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_class_id: &str,
    ) -> Result<Option<AssetClassRow>, RepositoryError> {
        let result = asset_class
            .filter(id.eq(asset_class_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    // pub fn delete(&self, asset_class_id: &str) -> Result<(), RepositoryError> {
    //     diesel::delete(asset_class)
    //         .filter(id.eq(asset_class_id))
    //         .execute(self.connection.lock().connection())?;
    //     Ok(())
    // }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetClassRow>, RepositoryError> {
        Ok(asset_class::table
            .filter(asset_class::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for AssetClassRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AssetClassRowRepository::new(con)._upsert_one(self)?;
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
            AssetClassRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
