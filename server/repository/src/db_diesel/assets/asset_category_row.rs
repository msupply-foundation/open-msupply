use super::asset_category_row::asset_category::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::RepositoryError;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogRepository, RowActionType};

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
    ) -> Result<(), RepositoryError> {
        self._upsert_one(asset_category_row)?;
        let changelog = AssetCategoryRow::generate_changelog(
            asset_category_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
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

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetCategoryRow>, RepositoryError> {
        Ok(asset_category::table
            .filter(asset_category::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn check_exists_by_id(&self, asset_category_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            asset_category::table.filter(asset_category::id.eq(asset_category_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }
}
