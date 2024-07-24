use super::asset_category_row::{
    asset_category::{self, dsl as asset_category_dsl},
    AssetCategoryRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};

pub enum AssetCategorySortField {
    Name,
}

pub type AssetCategorySort = Sort<AssetCategorySortField>;

#[derive(Clone, Default)]
pub struct AssetCategoryFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub class_id: Option<EqualFilter<String>>,
}

impl AssetCategoryFilter {
    pub fn new() -> AssetCategoryFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn class_id(mut self, filter: EqualFilter<String>) -> Self {
        self.class_id = Some(filter);
        self
    }
}

pub struct AssetCategoryRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCategoryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCategoryRepository { connection }
    }

    pub fn count(&self, filter: Option<AssetCategoryFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: AssetCategoryFilter,
    ) -> Result<Option<AssetCategoryRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: AssetCategoryFilter,
    ) -> Result<Vec<AssetCategoryRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetCategoryFilter>,
        sort: Option<AssetCategorySort>,
    ) -> Result<Vec<AssetCategoryRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                AssetCategorySortField::Name => {
                    apply_sort_no_case!(query, sort, asset_category_dsl::name);
                }
            }
        } else {
            query = query.order(asset_category_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<AssetCategoryRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(asset_category_row: AssetCategoryRow) -> AssetCategoryRow {
    asset_category_row
}

type BoxedAssetCategoryQuery = IntoBoxed<'static, asset_category::table, DBType>;

fn create_filtered_query(filter: Option<AssetCategoryFilter>) -> BoxedAssetCategoryQuery {
    let mut query = asset_category_dsl::asset_category.into_boxed();

    if let Some(f) = filter {
        let AssetCategoryFilter { id, name, class_id } = f;

        apply_equal_filter!(query, id, asset_category_dsl::id);
        apply_string_filter!(query, name, asset_category_dsl::name);
        apply_equal_filter!(query, class_id, asset_category_dsl::asset_class_id);
    }
    query
}

#[cfg(test)]
mod tests {
    use crate::{
        assets::{
            asset_category::AssetCategoryRepository,
            asset_category_row::{AssetCategoryRow, AssetCategoryRowRepository},
            asset_class_row::AssetClassRow,
            asset_class_row::AssetClassRowRepository,
        },
        mock::MockDataInserts,
        test_db, EqualFilter, StringFilter,
    };

    use super::AssetCategoryFilter;

    #[actix_rt::test]
    async fn test_asset_category_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_asset_category_query_repository",
            MockDataInserts::none(),
        )
        .await;

        // Create a class row
        let class_id = "test_class_id".to_string();
        let class_name = "test_class_name".to_string();
        let class_row = AssetClassRow {
            id: class_id.clone(),
            name: class_name.clone(),
        };
        let class_row_repo = AssetClassRowRepository::new(&storage_connection);
        class_row_repo.upsert_one(&class_row).unwrap();

        // Create the category
        let id = "test_id".to_string();
        let name = "test_name".to_string();

        // Insert a row
        let _category_row =
            AssetCategoryRowRepository::new(&storage_connection).upsert_one(&AssetCategoryRow {
                id: id.clone(),
                name: name.clone(),
                class_id: class_id.clone(),
            });

        // Query by id
        let category = AssetCategoryRepository::new(&storage_connection)
            .query_one(AssetCategoryFilter::new().id(EqualFilter::equal_to(&id)))
            .unwrap()
            .unwrap();
        assert_eq!(category.id, id);
        assert_eq!(category.name, name);

        // Query by name
        let category = AssetCategoryRepository::new(&storage_connection)
            .query_one(AssetCategoryFilter::new().name(StringFilter::equal_to(&name)))
            .unwrap()
            .unwrap();
        assert_eq!(category.id, id);
        assert_eq!(category.name, name);
    }
}
