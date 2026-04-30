use super::asset_category_row::asset_category::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::RepositoryError;
use crate::SourceSiteIdForChangelog;
use crate::StorageConnection;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};
use crate::{ChangelogSyncType, Upsert};

use diesel::prelude::*;

table! {
    asset_category (id) {
        id -> Text,
        name -> Text,
        asset_class_id -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = asset_category)]
pub struct AssetCategoryRow {
    pub id: String,
    pub name: String,
    #[diesel(column_name = "asset_class_id")]
    pub class_id: String,
}

impl AssetCategoryRow {
    pub(crate) fn changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteIdForChangelog,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetCategory,
            record_id,
            row_action: action,
            store_id: None,
            name_id: None,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

pub struct AssetCategoryRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCategoryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCategoryRowRepository { connection }
    }

    pub fn _upsert_one(
        &self,
        asset_category_row: &AssetCategoryRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_category)
            .values(asset_category_row)
            .on_conflict(id)
            .do_update()
            .set(asset_category_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_category_row: &AssetCategoryRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_category_row)?;
        let changelog = AssetCategoryRow::changelog(
            asset_category_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteIdForChangelog::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetCategoryRow>, RepositoryError> {
        let result = asset_category.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_category_id: &str,
    ) -> Result<Option<AssetCategoryRow>, RepositoryError> {
        let result = asset_category
            .filter(id.eq(asset_category_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    // pub fn delete(&self, asset_category_id: &str) -> Result<(), RepositoryError> {
    //     diesel::delete(asset_category)
    //         .filter(id.eq(asset_category_id))
    //         .execute(self.connection.lock().connection())?;
    //     Ok(())
    // }
}

impl Upsert for AssetCategoryRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AssetCategoryRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteIdForChangelog::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetCategoryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
