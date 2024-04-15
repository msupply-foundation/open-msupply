use super::asset_catalogue_item_property_row::asset_catalogue_item_property::dsl::*;

use crate::asset_catalogue_property_row::asset_catalogue_property;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;

table! {
    asset_catalogue_item_property (id) {
        id -> Text,
        asset_catalogue_item_id -> Text,
        asset_catalogue_property_id -> Text,
        value_string -> Nullable<Text>,
        value_int -> Nullable<Integer>,
        value_float -> Nullable<Double>,
        value_bool -> Nullable<Bool>,
    }
}

allow_tables_to_appear_in_same_query!(asset_catalogue_item_property, asset_catalogue_property);
joinable!(asset_catalogue_item_property -> asset_catalogue_property (asset_catalogue_property_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "asset_catalogue_item_property"]
#[changeset_options(treat_none_as_null = "true")]
pub struct AssetCatalogueItemPropertyRow {
    pub id: String,
    #[column_name = "asset_catalogue_item_id"]
    pub catalogue_item_id: String,
    #[column_name = "asset_catalogue_property_id"]
    pub catalogue_property_id: String,
    pub value_string: Option<String>,
    pub value_int: Option<i32>,
    pub value_float: Option<f64>,
    pub value_bool: Option<bool>,
}

pub struct AssetCatalogueItemPropertyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCatalogueItemPropertyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCatalogueItemPropertyRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(
        &self,
        asset_catalogue_item_property_row: &AssetCatalogueItemPropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_item_property)
            .values(asset_catalogue_item_property_row)
            .on_conflict(id)
            .do_update()
            .set(asset_catalogue_item_property_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(
        &self,
        asset_catalogue_item_property_row: &AssetCatalogueItemPropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_catalogue_item_property)
            .values(asset_catalogue_item_property_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_one(
        &self,
        asset_catalogue_item_property_row: &AssetCatalogueItemPropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_item_property)
            .values(asset_catalogue_item_property_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<AssetCatalogueItemPropertyRow>, RepositoryError> {
        let result = asset_catalogue_item_property.load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        asset_catalogue_item_property_id: &str,
    ) -> Result<Option<AssetCatalogueItemPropertyRow>, RepositoryError> {
        let result = asset_catalogue_item_property
            .filter(id.eq(asset_catalogue_item_property_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_catalogue_item_property_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_catalogue_item_property)
            .filter(id.eq(asset_catalogue_item_property_id))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

impl Upsert for AssetCatalogueItemPropertyRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        AssetCatalogueItemPropertyRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetCatalogueItemPropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
