use std::ops::DerefMut;

use super::asset_catalogue_item_row::asset_catalogue_item::dsl::*;

use serde::{Deserialize, Serialize};

use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;

table! {
    asset_catalogue_item (id) {
        id -> Text,
        asset_category_id -> Text,
        asset_class_id -> Text,
        code -> Text,
        manufacturer -> Nullable<Text>,
        model -> Text,
        asset_type_id -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = asset_catalogue_item)]
#[diesel(treat_none_as_null = true)]
pub struct AssetCatalogueItemRow {
    pub id: String,
    #[diesel(column_name = "asset_category_id")]
    pub category_id: String,
    #[diesel(column_name = "asset_class_id")]
    pub class_id: String,
    pub code: String,
    pub manufacturer: Option<String>,
    pub model: String,
    #[diesel(column_name = "asset_type_id")]
    pub type_id: String,
}

pub struct AssetCatalogueItemRowRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> AssetCatalogueItemRowRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        AssetCatalogueItemRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        asset_catalogue_item_row: &AssetCatalogueItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_item)
            .values(asset_catalogue_item_row)
            .on_conflict(id)
            .do_update()
            .set(asset_catalogue_item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &mut self,
        asset_catalogue_item_row: &AssetCatalogueItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_catalogue_item)
            .values(asset_catalogue_item_row)
            .execute(self.connection.connection.deref_mut())?;
        Ok(())
    }

    pub fn insert_one(
        &mut self,
        asset_catalogue_item_row: &AssetCatalogueItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_item)
            .values(asset_catalogue_item_row)
            .execute(self.connection.connection.deref_mut())?;
        Ok(())
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetCatalogueItemRow>, RepositoryError> {
        let result = asset_catalogue_item.load(&mut self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &mut self,
        asset_catalogue_item_id: &str,
    ) -> Result<Option<AssetCatalogueItemRow>, RepositoryError> {
        let result = asset_catalogue_item
            .filter(id.eq(asset_catalogue_item_id))
            .first(self.connection.connection.deref_mut())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&mut self, asset_catalogue_item_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_catalogue_item)
            .filter(id.eq(asset_catalogue_item_id))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for AssetCatalogueItemRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        AssetCatalogueItemRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            AssetCatalogueItemRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
