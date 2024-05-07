use super::asset_type_row::{
    asset_catalogue_type::{self, dsl as asset_type_dsl},
    AssetTypeRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};

pub enum AssetTypeSortField {
    Name,
}

pub type AssetTypeSort = Sort<AssetTypeSortField>;

#[derive(Clone, Default)]
pub struct AssetTypeFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub category_id: Option<EqualFilter<String>>,
}

impl AssetTypeFilter {
    pub fn new() -> AssetTypeFilter {
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

    pub fn category_id(mut self, filter: EqualFilter<String>) -> Self {
        self.category_id = Some(filter);
        self
    }
}

pub struct AssetTypeRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetTypeRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetTypeRepository { connection }
    }

    pub fn count(&self, filter: Option<AssetTypeFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: AssetTypeFilter,
    ) -> Result<Option<AssetTypeRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: AssetTypeFilter,
    ) -> Result<Vec<AssetTypeRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetTypeFilter>,
        sort: Option<AssetTypeSort>,
    ) -> Result<Vec<AssetTypeRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                AssetTypeSortField::Name => {
                    apply_sort_no_case!(query, sort, asset_type_dsl::name);
                }
            }
        } else {
            query = query.order(asset_type_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<AssetTypeRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(asset_type_row: AssetTypeRow) -> AssetTypeRow {
    asset_type_row
}

type BoxedAssetTypeQuery = IntoBoxed<'static, asset_catalogue_type::table, DBType>;

fn create_filtered_query(filter: Option<AssetTypeFilter>) -> BoxedAssetTypeQuery {
    let mut query = asset_type_dsl::asset_catalogue_type.into_boxed();

    if let Some(f) = filter {
        let AssetTypeFilter {
            id,
            name,
            category_id,
        } = f;

        apply_equal_filter!(query, id, asset_type_dsl::id);
        apply_string_filter!(query, name, asset_type_dsl::name);
        apply_equal_filter!(query, category_id, asset_type_dsl::asset_category_id);
    }
    query
}

#[cfg(test)]
mod tests {
    use crate::{
        assets::{
            asset_category_row::{AssetCategoryRow, AssetCategoryRowRepository},
            asset_class_row::{AssetClassRow, AssetClassRowRepository},
            asset_type::AssetTypeRepository,
            asset_type_row::{AssetTypeRow, AssetTypeRowRepository},
        },
        mock::MockDataInserts,
        test_db, EqualFilter, StringFilter,
    };

    use super::AssetTypeFilter;

    #[actix_rt::test]
    async fn test_asset_type_query_repository() {
        // Prepare
        let (_, mut storage_connection, _, _) =
            test_db::setup_all("test_asset_type_query_repository", MockDataInserts::none()).await;

        // Create a class row
        let class_id = "test_class_id".to_string();
        let class_name = "test_class_name".to_string();
        let class_row = AssetClassRow {
            id: class_id.clone(),
            name: class_name.clone(),
        };
        let class_row_repo = AssetClassRowRepository::new(&mut storage_connection);
        class_row_repo.insert_one(&class_row).unwrap();

        // Create a category
        let category_id = "test_category_id".to_string();
        let category_name = "test_category_name".to_string();
        let category_row = AssetCategoryRow {
            id: category_id.clone(),
            name: category_name.clone(),
            class_id: class_id.clone(),
        };
        let category_row_repo = AssetCategoryRowRepository::new(&mut storage_connection);
        category_row_repo.insert_one(&category_row).unwrap();

        // Create the type
        let id = "test_id".to_string();
        let name = "test_name".to_string();

        // Insert a row
        let _type_row =
            AssetTypeRowRepository::new(&mut storage_connection).insert_one(&AssetTypeRow {
                id: id.clone(),
                name: name.clone(),
                category_id: category_id.clone(),
            });

        // Query by id
        let t = AssetTypeRepository::new(&mut storage_connection)
            .query_one(AssetTypeFilter::new().id(EqualFilter::equal_to(&id)))
            .unwrap()
            .unwrap();
        assert_eq!(t.id, id);
        assert_eq!(t.name, name);

        // Query by name
        let t = AssetTypeRepository::new(&mut storage_connection)
            .query_one(AssetTypeFilter::new().name(StringFilter::equal_to(&name)))
            .unwrap()
            .unwrap();
        assert_eq!(t.id, id);
        assert_eq!(t.name, name);
    }
}
