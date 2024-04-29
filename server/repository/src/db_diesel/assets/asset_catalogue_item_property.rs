use super::asset_catalogue_item_property_row::{
    asset_catalogue_item_property,
    asset_catalogue_item_property::dsl as asset_catalogue_item_property_dsl,
    AssetCatalogueItemPropertyRow,
};
use super::asset_catalogue_property_row::{
    asset_catalogue_property, asset_catalogue_property::dsl as asset_catalogue_property_dsl,
    AssetCataloguePropertyRow,
};

use crate::{diesel_macros::apply_equal_filter, StorageConnection};

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::helper_types::{InnerJoin, IntoBoxed};
use diesel::prelude::*;

#[derive(Clone, PartialEq, Debug, Default)]
pub struct AssetCataloguePropertyItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub catalogue_property_id: Option<EqualFilter<String>>,
    pub catalogue_item_id: Option<EqualFilter<String>>,
}

pub struct AssetCatalogueItemPropertyRepository<'a> {
    connection: &'a StorageConnection,
}

type AssetCatalogueItemPropertyJoin = (AssetCatalogueItemPropertyRow, AssetCataloguePropertyRow);

#[derive(Clone)]
pub struct AssetCatalogueItemPropertyValue {
    pub property: AssetCataloguePropertyRow,
    pub value: AssetCatalogueItemPropertyRow,
}

impl<'a> AssetCatalogueItemPropertyRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCatalogueItemPropertyRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<AssetCataloguePropertyItemFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query(
        &self,
        filter: Option<AssetCataloguePropertyItemFilter>,
    ) -> Result<Vec<AssetCatalogueItemPropertyRow>, RepositoryError> {
        let query = create_filtered_query(filter.clone());

        // // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result =
            query.load::<AssetCatalogueItemPropertyRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn query_property_and_value(
        &self,
        filter: AssetCataloguePropertyItemFilter,
    ) -> Result<Vec<AssetCatalogueItemPropertyValue>, RepositoryError> {
        let query = create_filtered_property_value_query(filter);

        // // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result =
            query.load::<AssetCatalogueItemPropertyJoin>(self.connection.lock().connection())?;

        Ok(result
            .into_iter()
            .map(|pv| AssetCatalogueItemPropertyValue::to_domain(pv))
            .collect())
    }
}
type BoxedAssetCatalogueItemPropertyQuery =
    asset_catalogue_item_property::BoxedQuery<'static, DBType>;

pub fn to_domain(
    asset_catalogue_property_item_row: AssetCatalogueItemPropertyRow,
) -> AssetCatalogueItemPropertyRow {
    asset_catalogue_property_item_row
}

impl AssetCatalogueItemPropertyValue {
    pub fn to_domain(
        (asset_catalogue_property_item_row, asset_catalogue_property_row): AssetCatalogueItemPropertyJoin,
    ) -> AssetCatalogueItemPropertyValue {
        AssetCatalogueItemPropertyValue {
            property: asset_catalogue_property_row,
            value: asset_catalogue_property_item_row,
        }
    }
}

type BoxedAssetCatalogueItemPropertyValueQuery = IntoBoxed<
    'static,
    InnerJoin<asset_catalogue_item_property::table, asset_catalogue_property::table>,
    DBType,
>;

fn create_filtered_query(
    filter: Option<AssetCataloguePropertyItemFilter>,
) -> BoxedAssetCatalogueItemPropertyQuery {
    let mut query = asset_catalogue_item_property_dsl::asset_catalogue_item_property
        // .inner_join(asset_catalogue_property_dsl::asset_catalogue_property)
        .into_boxed();

    if let Some(f) = filter {
        let AssetCataloguePropertyItemFilter {
            id,
            catalogue_property_id,
            catalogue_item_id,
        } = f;

        apply_equal_filter!(query, id, asset_catalogue_item_property_dsl::id);
        apply_equal_filter!(
            query,
            catalogue_property_id,
            asset_catalogue_item_property_dsl::asset_catalogue_property_id
        );
        apply_equal_filter!(
            query,
            catalogue_item_id,
            asset_catalogue_item_property_dsl::asset_catalogue_item_id
        );
    }
    query
}

fn create_filtered_property_value_query(
    filter: AssetCataloguePropertyItemFilter,
) -> BoxedAssetCatalogueItemPropertyValueQuery {
    let mut query = asset_catalogue_item_property_dsl::asset_catalogue_item_property
        .inner_join(asset_catalogue_property_dsl::asset_catalogue_property)
        .into_boxed();

    let AssetCataloguePropertyItemFilter {
        id,
        catalogue_property_id,
        catalogue_item_id,
    } = filter;

    apply_equal_filter!(query, id, asset_catalogue_item_property_dsl::id);
    apply_equal_filter!(
        query,
        catalogue_property_id,
        asset_catalogue_item_property_dsl::asset_catalogue_property_id
    );
    apply_equal_filter!(
        query,
        catalogue_item_id,
        asset_catalogue_item_property_dsl::asset_catalogue_item_id
    );

    query
}

impl AssetCataloguePropertyItemFilter {
    pub fn new() -> AssetCataloguePropertyItemFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn catalogue_item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.catalogue_item_id = Some(filter);
        self
    }

    pub fn catalogue_property_id(mut self, filter: EqualFilter<String>) -> Self {
        self.catalogue_property_id = Some(filter);
        self
    }
}
