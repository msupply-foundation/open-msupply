use super::asset_type_row::asset_catalogue_type::dsl::*;

use serde::Deserialize;
use serde::Serialize;

use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

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

    pub fn upsert_one(&self, asset_type_row: &AssetTypeRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(asset_catalogue_type)
            .values(asset_type_row)
            .on_conflict(id)
            .do_update()
            .set(asset_type_row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&asset_type_row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetCatalogueType,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
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

    // pub fn delete(&self, asset_type_id: &str) -> Result<(), RepositoryError> {
    //     diesel::delete(asset_catalogue_type)
    //         .filter(id.eq(asset_type_id))
    //         .execute(self.connection.lock().connection())?;
    //     Ok(())
    // }
}

impl Upsert for AssetTypeRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = AssetTypeRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
