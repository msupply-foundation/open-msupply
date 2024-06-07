use super::asset_property_row::{
    asset_property, asset_property::dsl as asset_property_dsl, AssetPropertyRow,
};

use crate::diesel_macros::apply_string_filter;
use crate::StringFilter;
use crate::{diesel_macros::apply_equal_filter, StorageConnection};

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::prelude::*;

#[derive(Clone, PartialEq, Debug, Default)]
pub struct AssetPropertyFilter {
    pub id: Option<EqualFilter<String>>,
    pub key: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub asset_class_id: Option<EqualFilter<String>>,
    pub asset_category_id: Option<EqualFilter<String>>,
    pub asset_type_id: Option<EqualFilter<String>>,
}

pub struct AssetPropertyRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetPropertyRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetPropertyRepository { connection }
    }

    pub fn query(
        &self,
        filter: Option<AssetPropertyFilter>,
    ) -> Result<Vec<AssetPropertyRow>, RepositoryError> {
        let query = create_filtered_query(filter.clone());

        // // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query.load::<AssetPropertyRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedAssetCatalogueItemPropertyQuery = asset_property::BoxedQuery<'static, DBType>;

pub fn to_domain(asset_property_row: AssetPropertyRow) -> AssetPropertyRow {
    asset_property_row
}

fn create_filtered_query(
    filter: Option<AssetPropertyFilter>,
) -> BoxedAssetCatalogueItemPropertyQuery {
    let mut query = asset_property_dsl::asset_property.into_boxed();

    if let Some(f) = filter {
        let AssetPropertyFilter {
            id,
            key,
            name,
            asset_class_id,
            asset_category_id,
            asset_type_id,
        } = f;

        apply_equal_filter!(query, id, asset_property_dsl::id);
        apply_equal_filter!(query, key, asset_property_dsl::key);
        apply_string_filter!(query, name, asset_property_dsl::name);
        apply_equal_filter!(query, asset_class_id, asset_property_dsl::asset_class_id);
        apply_equal_filter!(
            query,
            asset_category_id,
            asset_property_dsl::asset_category_id
        );
        apply_equal_filter!(query, asset_type_id, asset_property_dsl::asset_type_id);
    }
    query
}

impl AssetPropertyFilter {
    pub fn new() -> AssetPropertyFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
}
