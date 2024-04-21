use super::asset_catalogue_property_row::asset_catalogue_property::dsl::*;

use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::RowActionType;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum PropertyValueType {
    String,
    Boolean,
    Integer,
    Float,
}

table! {
    asset_catalogue_property (id) {
        id -> Text,
        asset_category_id -> Text,
        name -> Text,
        value_type -> crate::db_diesel::asset_catalogue_property_row::PropertyValueTypeMapping,
        allowed_values -> Nullable<Text>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = asset_catalogue_property)]
#[diesel(treat_none_as_null = true)]
pub struct AssetCataloguePropertyRow {
    pub id: String,
    #[diesel(column_name = asset_category_id)]
    pub category_id: String,
    pub name: String,
    pub value_type: PropertyValueType,
    pub allowed_values: Option<String>,
}

impl Default for AssetCataloguePropertyRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            category_id: Default::default(),
            name: Default::default(),
            value_type: PropertyValueType::String,
            allowed_values: Default::default(),
        }
    }
}

pub struct AssetCataloguePropertyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCataloguePropertyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCataloguePropertyRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(
        &self,
        asset_catalogue_property_row: &AssetCataloguePropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_property)
            .values(asset_catalogue_property_row)
            .on_conflict(id)
            .do_update()
            .set(asset_catalogue_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(
        &self,
        asset_catalogue_property_row: &AssetCataloguePropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_catalogue_property)
            .values(asset_catalogue_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_catalogue_property_row: &AssetCataloguePropertyRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_catalogue_property_row)?;
        self.insert_changelog(
            asset_catalogue_property_row.id.to_owned(),
            RowActionType::Upsert,
        )
    }

    fn insert_changelog(
        &self,
        asset_catalogue_property_row: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetCatalogueProperty,
            record_id: asset_catalogue_property_row,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<AssetCataloguePropertyRow>, RepositoryError> {
        let result = asset_catalogue_property.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        asset_catalogue_property_id: &str,
    ) -> Result<Option<AssetCataloguePropertyRow>, RepositoryError> {
        let result = asset_catalogue_property
            .filter(id.eq(asset_catalogue_property_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_catalogue_property_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_catalogue_property)
            .filter(id.eq(asset_catalogue_property_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for AssetCataloguePropertyRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = AssetCataloguePropertyRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        // We'll return the later changelog id, as that's the one that will be marked as coming from this site...
        let cursor_id = AssetCataloguePropertyRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetCataloguePropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
