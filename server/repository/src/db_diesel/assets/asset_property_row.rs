use super::asset_property_row::asset_property::dsl::*;

use serde::{Deserialize, Serialize};

use crate::types::PropertyValueType;
use crate::ChangelogRepository;
use crate::RepositoryError;
use crate::RowActionType;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogSyncType, Upsert};

use diesel::prelude::*;

table! {
    asset_property (id) {
        id -> Text,
        key -> Text,
        name -> Text,
        asset_class_id -> Nullable<Text>,
        asset_category_id -> Nullable<Text>,
        asset_type_id -> Nullable<Text>,
        value_type -> crate::db_diesel::assets::types::PropertyValueTypeMapping,
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
    pub key: String,
    pub name: String,
    pub asset_class_id: Option<String>,
    pub asset_category_id: Option<String>,
    pub asset_type_id: Option<String>,
    pub value_type: PropertyValueType,
    pub allowed_values: Option<String>,
}
pub struct AssetPropertyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetPropertyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetPropertyRowRepository { connection }
    }

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

    pub fn upsert_one(
        &self,
        asset_property_row: &AssetPropertyRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(asset_property_row)?;
        let changelog = AssetPropertyRow::generate_changelog(
            asset_property_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetPropertyRow>, RepositoryError> {
        Ok(asset_property::table
            .filter(asset_property::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for AssetPropertyRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        AssetPropertyRowRepository::new(con)._upsert_one(self)?;
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
            AssetPropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
