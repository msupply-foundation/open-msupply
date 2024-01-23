use super::asset_row::asset::dsl as asset_dsl;
use super::store_row::store;
use crate::repository_error::RepositoryError;
use crate::Delete;
use crate::StorageConnection;
use crate::Upsert;
use diesel::prelude::*;

table! {
    asset (id) {
        id -> Text,
        property -> Nullable<Text>,
        store_id -> Text,
    }
}

table! {
    #[sql_name = "asset"]
    asset_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

joinable!(asset -> store (store_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "asset"]
pub struct AssetRow {
    pub id: String,
    pub property: Option<String>,
    pub store_id: String,
}

pub struct AssetRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    fn _upsert_one(&self, row: &AssetRow) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_dsl::asset)
            .values(row)
            .on_conflict(asset_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, row: &AssetRow) -> Result<(), RepositoryError> {
        diesel::replace_into(asset_dsl::asset)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    fn toggle_is_sync_update(&self, id: &str, is_sync_update: bool) -> Result<(), RepositoryError> {
        diesel::update(asset_is_sync_update::table.find(id))
            .set(asset_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &AssetRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, false)?;
        Ok(())
    }

    pub fn delete(&self, asset_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(asset_dsl::asset.filter(asset_dsl::id.eq(asset_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<AssetRow>, RepositoryError> {
        let result = asset_dsl::asset
            .filter(asset_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn sync_upsert_one(&self, row: &AssetRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = asset_is_sync_update::table
            .find(id)
            .select(asset_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

impl Upsert for AssetRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        AssetRowRepository::new(con).sync_upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct AssetRowDelete(pub String);
// This is just example, deletes can only be done on pure remote records belonging only to one site
// otherwise soft deletes are done via upsert
impl Delete for AssetRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        AssetRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            AssetRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

#[cfg(test)]
mod test {
    use crate::{
        asset_row::{AssetRow, AssetRowRepository},
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn asset_is_sync_update() {
        let (_, connection, _, _) = setup_all(
            "asset_is_sync_update",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let repo = AssetRowRepository::new(&connection);
        // Two rows, to make sure is_sync_update update only affects one row
        let row = AssetRow {
            id: "asset1".to_string(),
            store_id: mock_store_a().id,
            property: Some("property1".to_string()),
        };
        let row2 = AssetRow {
            id: "asset2".to_string(),
            store_id: mock_store_a().id,
            property: Some("property2".to_string()),
        };
        // First insert
        repo.upsert_one(&row).unwrap();
        repo.upsert_one(&row2).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Synchronisation upsert
        repo.sync_upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(true)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Normal upsert
        repo.upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));
    }
}
