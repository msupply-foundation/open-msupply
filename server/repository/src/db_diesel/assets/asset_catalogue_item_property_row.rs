use super::asset_catalogue_item_property_row::asset_catalogue_item_property::dsl::*;

use crate::asset_catalogue_property_row::asset_catalogue_property;
use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::RowActionType;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

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

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = asset_catalogue_item_property)]
pub struct AssetCatalogueItemPropertyRow {
    pub id: String,
    #[diesel(column_name = asset_catalogue_item_id)]
    pub catalogue_item_id: String,
    #[diesel(column_name = asset_catalogue_property_id)]
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
    pub fn _upsert_one(
        &self,
        asset_catalogue_item_property_row: &AssetCatalogueItemPropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_item_property)
            .values(asset_catalogue_item_property_row)
            .on_conflict(id)
            .do_update()
            .set(asset_catalogue_item_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(
        &self,
        asset_catalogue_item_property_row: &AssetCatalogueItemPropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_catalogue_item_property)
            .values(asset_catalogue_item_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_catalogue_item_property_row: &AssetCatalogueItemPropertyRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_catalogue_item_property_row)?;
        self.insert_changelog(
            asset_catalogue_item_property_row.id.to_owned(),
            RowActionType::Upsert,
        )
    }

    fn insert_changelog(
        &self,
        asset_catalogue_item_property_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetCatalogueItemProperty,
            record_id: asset_catalogue_item_property_id,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<AssetCatalogueItemPropertyRow>, RepositoryError> {
        let result = asset_catalogue_item_property.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        asset_catalogue_item_property_id: &str,
    ) -> Result<Option<AssetCatalogueItemPropertyRow>, RepositoryError> {
        let result = asset_catalogue_item_property
            .filter(id.eq(asset_catalogue_item_property_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_catalogue_item_property_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_catalogue_item_property)
            .filter(id.eq(asset_catalogue_item_property_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for AssetCatalogueItemPropertyRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = AssetCatalogueItemPropertyRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        // We'll return the later changelog id, as that's the one that will be marked as coming from this site...
        let cursor_id = AssetCatalogueItemPropertyRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetCatalogueItemPropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
