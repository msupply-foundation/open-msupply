use super::asset_catalogue_item_row::asset_catalogue_item::dsl::*;

use serde::{Deserialize, Serialize};

use crate::diesel_macros::define_batch_table;
use crate::RepositoryError;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogRepository, RowActionType};

use diesel::prelude::*;

define_batch_table! {
    struct: AssetCatalogueItemRow,
    repo: AssetCatalogueItemRowRepository,
    table: asset_catalogue_item (id) {
        id -> Text,
        sub_catalogue -> Text,
        asset_category_id as category_id -> Text,
        asset_class_id as class_id -> Text,
        code -> Text,
        manufacturer -> Nullable<Text>,
        model -> Text,
        asset_catalogue_type_id as type_id -> Text,
        properties -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = asset_catalogue_item)]
#[diesel(treat_none_as_null = true)]
pub struct AssetCatalogueItemRow {
    pub id: String,
    pub sub_catalogue: String,
    #[diesel(column_name = "asset_category_id")]
    pub category_id: String,
    #[diesel(column_name = "asset_class_id")]
    pub class_id: String,
    pub code: String,
    pub manufacturer: Option<String>,
    pub model: String,
    #[diesel(column_name = "asset_catalogue_type_id")]
    pub type_id: String,
    pub properties: Option<String>,
    pub deleted_datetime: Option<chrono::NaiveDateTime>,
}
pub struct AssetCatalogueItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCatalogueItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCatalogueItemRowRepository { connection }
    }

    pub fn _upsert_one(
        &self,
        asset_catalogue_item_row: &AssetCatalogueItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(asset_catalogue_item)
            .values(asset_catalogue_item_row)
            .on_conflict(id)
            .do_update()
            .set(asset_catalogue_item_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        asset_catalogue_item_row: &AssetCatalogueItemRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(asset_catalogue_item_row)?;
        let changelog = AssetCatalogueItemRow::generate_changelog(
            asset_catalogue_item_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&mut self) -> Result<Vec<AssetCatalogueItemRow>, RepositoryError> {
        let result = asset_catalogue_item.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        asset_catalogue_item_id: &str,
    ) -> Result<Option<AssetCatalogueItemRow>, RepositoryError> {
        let result = asset_catalogue_item
            .filter(id.eq(asset_catalogue_item_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, asset_catalogue_item_id: &str) -> Result<(), RepositoryError> {
        diesel::update(asset_catalogue_item.filter(id.eq(asset_catalogue_item_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        let changelog = AssetCatalogueItemRow::generate_changelog(
            asset_catalogue_item_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<AssetCatalogueItemRow>, RepositoryError> {
        Ok(asset_catalogue_item::table
            .filter(asset_catalogue_item::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn check_exists_by_id(&self, asset_catalogue_item_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            asset_catalogue_item::table.filter(asset_catalogue_item::id.eq(asset_catalogue_item_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }
}

#[cfg(test)]
mod batch_upsert_test {
    use crate::db_diesel::assets::asset_category_row::{AssetCategoryRow, AssetCategoryRowRepository};
    use crate::db_diesel::assets::asset_class_row::{AssetClassRow, AssetClassRowRepository};
    use crate::{mock::MockDataInserts, test_db::setup_all};

    fn category(id: &str, class_id: &str) -> AssetCategoryRow {
        AssetCategoryRow {
            id: id.to_string(),
            name: format!("name_{id}"),
            // `class_id` is remapped to column `asset_class_id` via
            // `#[diesel(column_name = ..)]` — the generated `WalkRow` must bind the
            // FIELD (class_id) to the COLUMN (asset_class_id).
            class_id: class_id.to_string(),
        }
    }

    /// Proves the generated raw-SQL `batch_upsert` binds a `#[diesel(column_name)]`
    /// remapped field to the correct column (asset_category.class_id -> asset_class_id),
    /// in one multi-row `INSERT ... ON CONFLICT DO UPDATE` on SQLite.
    #[actix_rt::test]
    async fn generated_batch_upsert_round_trips_remapped_columns() {
        let (_, con, _, _) = setup_all(
            "asset_category_generated_batch_upsert",
            MockDataInserts::none(),
        )
        .await;

        // FK parent for class_id -> asset_class_id.
        AssetClassRowRepository::new(&con)
            ._upsert_one(&AssetClassRow {
                id: "class_1".to_string(),
                name: "class".to_string(),
            })
            .unwrap();

        let repo = AssetCategoryRowRepository::new(&con);
        let row1 = category("cat_1", "class_1");
        let row2 = category("cat_2", "class_1");

        repo.batch_upsert(vec![&row1, &row2]).unwrap();
        assert_eq!(repo.find_one_by_id("cat_1").unwrap(), Some(row1));
        assert_eq!(repo.find_one_by_id("cat_2").unwrap(), Some(row2));

        // Conflict on cat_2 -> UPDATE (name flips); cat_3 new -> INSERT.
        let mut row2_v2 = category("cat_2", "class_1");
        row2_v2.name = "renamed".to_string();
        let row3 = category("cat_3", "class_1");
        repo.batch_upsert(vec![&row2_v2, &row3]).unwrap();
        assert_eq!(repo.find_one_by_id("cat_2").unwrap(), Some(row2_v2));
        assert_eq!(repo.find_one_by_id("cat_3").unwrap(), Some(row3));
    }
}
