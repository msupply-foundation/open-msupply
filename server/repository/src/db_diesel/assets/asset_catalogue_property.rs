use super::asset_catalogue_property_row::{
    asset_catalogue_property, asset_catalogue_property::dsl as asset_catalogue_property_dsl,
    AssetCataloguePropertyRow,
};

use crate::{diesel_macros::apply_equal_filter, StorageConnection};

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::prelude::*;

#[derive(Clone, PartialEq, Debug, Default)]
pub struct AssetCataloguePropertyFilter {
    pub id: Option<EqualFilter<String>>,
    pub category_id: Option<EqualFilter<String>>,
}

pub struct AssetCatalogueItemPropertyPropertyRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCatalogueItemPropertyPropertyRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCatalogueItemPropertyPropertyRepository { connection }
    }

    pub fn query(
        &self,
        filter: Option<AssetCataloguePropertyFilter>,
    ) -> Result<Vec<AssetCataloguePropertyRow>, RepositoryError> {
        let query = create_filtered_query(filter.clone());

        // // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query.load::<AssetCataloguePropertyRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedAssetCatalogueItemPropertyQuery = asset_catalogue_property::BoxedQuery<'static, DBType>;

pub fn to_domain(
    asset_catalogue_property_row: AssetCataloguePropertyRow,
) -> AssetCataloguePropertyRow {
    asset_catalogue_property_row
}

fn create_filtered_query(
    filter: Option<AssetCataloguePropertyFilter>,
) -> BoxedAssetCatalogueItemPropertyQuery {
    let mut query = asset_catalogue_property_dsl::asset_catalogue_property.into_boxed();

    if let Some(f) = filter {
        let AssetCataloguePropertyFilter { id, category_id } = f;

        apply_equal_filter!(query, id, asset_catalogue_property_dsl::id);
        apply_equal_filter!(
            query,
            category_id,
            asset_catalogue_property_dsl::asset_category_id
        );
    }
    query
}

impl AssetCataloguePropertyFilter {
    pub fn new() -> AssetCataloguePropertyFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn category_id(mut self, filter: EqualFilter<String>) -> Self {
        self.category_id = Some(filter);
        self
    }
}
