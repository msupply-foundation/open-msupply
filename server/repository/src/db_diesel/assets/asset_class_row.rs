use super::asset_class_row::asset_class::dsl::*;

use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::prelude::*;
use serde::Deserialize;
use serde::Serialize;

table! {
    asset_class (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = asset_class)]
pub struct AssetClassRow {
    pub id: String,
    pub name: String,
}

pub struct AssetClassRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetClassRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetClassRowRepository { connection }
    }

    pub fn upsert_one(&self, asset_class_row: &AssetClassRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(asset_class)
            .values(asset_class_row)
            .on_conflict(id)
            .do_update()
            .set(asset_class_row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&asset_class_row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetClass,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetClassRow>, RepositoryError> {
        let result = asset_class.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        asset_class_id: &str,
    ) -> Result<Option<AssetClassRow>, RepositoryError> {
        let result = asset_class
            .filter(id.eq(asset_class_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    // pub fn delete(&self, asset_class_id: &str) -> Result<(), RepositoryError> {
    //     diesel::delete(asset_class)
    //         .filter(id.eq(asset_class_id))
    //         .execute(self.connection.lock().connection())?;
    //     Ok(())
    // }
}

impl Upsert for AssetClassRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = AssetClassRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetClassRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
