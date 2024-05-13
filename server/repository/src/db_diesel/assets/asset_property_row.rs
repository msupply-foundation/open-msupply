use super::asset_property_row::asset_property::dsl::*;

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

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum AssetPropertyValueType {
    #[default]
    String,
    Boolean,
    Integer,
    Float,
}

table! {
    asset_property (id) {
        id -> Text,
        name -> Text,
        value_type -> crate::db_diesel::asset_property_row::AssetPropertyValueTypeMapping,
        allowed_values -> Nullable<Text>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = asset_property)]
#[diesel(treat_none_as_null = true)]
pub struct AssetPropertyRow {
    pub id: String,
    pub name: String,
    pub value_type: AssetPropertyValueType,
    pub allowed_values: Option<String>,
}

pub struct AssetPropertyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetPropertyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetPropertyRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(
        &self,
        asset_property_row: &AssetPropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_property)
            .values(asset_property_row)
            .on_conflict(id)
            .do_update()
            .set(asset_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(
        &self,
        asset_property_row: &AssetPropertyRow,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_property)
            .values(asset_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_property_row: &AssetPropertyRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(asset_property_row)?;
        self.insert_changelog(asset_property_row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        asset_property_row: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetProperty,
            record_id: asset_property_row,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<AssetPropertyRow>, RepositoryError> {
        let result = asset_property.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        asset_property_id: &str,
    ) -> Result<Option<AssetPropertyRow>, RepositoryError> {
        let result = asset_property
            .filter(id.eq(asset_property_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, asset_property_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_property)
            .filter(id.eq(asset_property_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for AssetPropertyRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = AssetPropertyRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = AssetPropertyRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetPropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
