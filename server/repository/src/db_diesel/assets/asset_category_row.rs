use super::asset_category_row::asset_category::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

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

    pub fn upsert_one(
        &self,
        asset_category_row: &AssetCategoryRow,
    ) -> Result<i64, RepositoryError> {
        diesel::insert_into(asset_category)
            .values(asset_category_row)
            .on_conflict(id)
            .do_update()
            .set(asset_category_row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&asset_category_row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetCategory,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
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
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = AssetCategoryRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetCategoryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
