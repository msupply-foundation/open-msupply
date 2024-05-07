use super::asset_class_row::{
    asset_class::{self, dsl as asset_class_dsl},
    AssetClassRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};

pub enum AssetClassSortField {
    Name,
}

pub type AssetClassSort = Sort<AssetClassSortField>;

#[derive(Clone, Default)]
pub struct AssetClassFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
}

impl AssetClassFilter {
    pub fn new() -> AssetClassFilter {
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
}

pub struct AssetClassRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetClassRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetClassRepository { connection }
    }

    pub fn count(&self, filter: Option<AssetClassFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: AssetClassFilter,
    ) -> Result<Option<AssetClassRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: AssetClassFilter,
    ) -> Result<Vec<AssetClassRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetClassFilter>,
        sort: Option<AssetClassSort>,
    ) -> Result<Vec<AssetClassRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                AssetClassSortField::Name => {
                    apply_sort_no_case!(query, sort, asset_class_dsl::name);
                }
            }
        } else {
            query = query.order(asset_class_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<AssetClassRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(asset_class_row: AssetClassRow) -> AssetClassRow {
    asset_class_row
}

type BoxedAssetClassQuery = IntoBoxed<'static, asset_class::table, DBType>;

fn create_filtered_query(filter: Option<AssetClassFilter>) -> BoxedAssetClassQuery {
    let mut query = asset_class_dsl::asset_class.into_boxed();

    if let Some(f) = filter {
        let AssetClassFilter { id, name } = f;

        apply_equal_filter!(query, id, asset_class_dsl::id);
        apply_string_filter!(query, name, asset_class_dsl::name);
    }
    query
}

#[cfg(test)]
mod tests {
    use crate::{
        assets::{
            asset_class::AssetClassRepository,
            asset_class_row::{AssetClassRow, AssetClassRowRepository},
        },
        mock::MockDataInserts,
        test_db, EqualFilter, StringFilter,
    };

    use super::AssetClassFilter;

    #[actix_rt::test]
    async fn test_asset_class_query_repository() {
        // Prepare
        let (_, mut storage_connection, _, _) =
            test_db::setup_all("test_asset_class_query_repository", MockDataInserts::none()).await;

        let id = "test_id".to_string();
        let name = "test_name".to_string();

        // Insert a row
        let _reference_data_row =
            AssetClassRowRepository::new(&mut storage_connection).insert_one(&AssetClassRow {
                id: id.clone(),
                name: name.clone(),
            });

        // Query by id
        let reference_data = AssetClassRepository::new(&mut storage_connection)
            .query_one(AssetClassFilter::new().id(EqualFilter::equal_to(&id)))
            .unwrap()
            .unwrap();
        assert_eq!(reference_data.id, id);
        assert_eq!(reference_data.name, name);

        // Query by name
        let reference_data = AssetClassRepository::new(&mut storage_connection)
            .query_one(AssetClassFilter::new().name(StringFilter::equal_to(&name)))
            .unwrap()
            .unwrap();
        assert_eq!(reference_data.id, id);
        assert_eq!(reference_data.name, name);
    }
}
