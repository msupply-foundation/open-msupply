use super::asset_type_row::asset_catalogue_type::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::RepositoryError;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogRepository, RowActionType};
use crate::{ChangelogSyncType, Upsert};

use diesel::prelude::*;

table! {
    asset_catalogue_type (id) {
        id -> Text,
        name -> Text,
        asset_category_id -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = asset_catalogue_type)]
pub struct AssetTypeRow {
    pub id: String,
    pub name: String,
    #[diesel(column_name = "asset_category_id")]
    pub category_id: String,
}
pub struct AssetTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetTypeRowRepository { connection }
    }

    pub fn _upsert_one(&self, asset_type_row: &AssetTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_type)
            .values(asset_type_row)
            .on_conflict(id)
            .do_update()
            .set(asset_type_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, asset_type_row: &AssetTypeRow) -> Result<(), RepositoryError> {
        self._upsert_one(asset_type_row)?;
        let changelog = AssetTypeRow::generate_changelog(
            asset_type_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetTypeRow>, RepositoryError> {
        let result = asset_catalogue_type.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_type_id: &str,
    ) -> Result<Option<AssetTypeRow>, RepositoryError> {
        let result = asset_catalogue_type
            .filter(id.eq(asset_type_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetTypeRow>, RepositoryError> {
        Ok(asset_catalogue_type
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    // pub fn delete(&self, asset_type_id: &str) -> Result<(), RepositoryError> {
    //     diesel::delete(asset_catalogue_type)
    //         .filter(id.eq(asset_type_id))
    //         .execute(self.connection.lock().connection())?;
    //     Ok(())
    // }
}

impl Upsert for AssetTypeRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AssetTypeRowRepository::new(con)._upsert_one(self)?;
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
            AssetTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
