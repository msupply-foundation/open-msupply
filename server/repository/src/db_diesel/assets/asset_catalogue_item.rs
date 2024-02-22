use super::{
    asset_catalogue_item_row::{
        asset_catalogue_item, asset_catalogue_item::dsl as asset_catalogue_item_dsl,
        AssetCatalogueItemRow,
    },
    asset_category::{AssetCategoryFilter, AssetCategoryRepository},
    asset_class::{AssetClassFilter, AssetClassRepository},
    asset_type::{AssetTypeFilter, AssetTypeRepository},
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    StorageConnection, StringFilter,
};

use crate::{repository_error::RepositoryError, DBType, EqualFilter, Pagination, Sort};
use diesel::prelude::*;

#[derive(PartialEq, Debug, Clone)]
pub struct AssetCatalogueItem {
    pub asset_catalogue_item_row: AssetCatalogueItemRow,
}

#[derive(Clone, PartialEq, Debug)]
pub struct AssetCatalogueItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub category: Option<StringFilter>,
    pub category_id: Option<EqualFilter<String>>,
    pub class: Option<StringFilter>,
    pub class_id: Option<EqualFilter<String>>,
    pub code: Option<StringFilter>,
    pub manufacturer: Option<StringFilter>,
    pub model: Option<StringFilter>,
    pub r#type: Option<StringFilter>,
    pub type_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum AssetCatalogueItemSortField {
    Catalogue,
    Code,
    Make,
    Model,
}

pub type AssetCatalogueItemSort = Sort<AssetCatalogueItemSortField>;

pub struct AssetCatalogueItemRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCatalogueItemRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCatalogueItemRepository { connection }
    }

    pub fn count(&self, filter: Option<AssetCatalogueItemFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: AssetCatalogueItemFilter,
    ) -> Result<Vec<AssetCatalogueItem>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetCatalogueItemFilter>,
        sort: Option<AssetCatalogueItemSort>,
    ) -> Result<Vec<AssetCatalogueItem>, RepositoryError> {
        let mut query = create_filtered_query(filter.clone());

        if let Some(sort) = sort {
            match sort.key {
                AssetCatalogueItemSortField::Catalogue => {
                    apply_sort_no_case!(query, sort, asset_catalogue_item_dsl::id)
                }
                AssetCatalogueItemSortField::Code => {
                    apply_sort_no_case!(query, sort, asset_catalogue_item_dsl::code)
                }
                AssetCatalogueItemSortField::Make => {
                    apply_sort_no_case!(query, sort, asset_catalogue_item_dsl::manufacturer)
                }
                AssetCatalogueItemSortField::Model => {
                    apply_sort_no_case!(query, sort, asset_catalogue_item_dsl::model)
                }
            }
        } else {
            query = query.order(asset_catalogue_item_dsl::id.asc())
        }
        if let Some(f) = filter {
            let AssetCatalogueItemFilter {
                category,
                class,
                r#type,
                ..
            } = f;
            if let Some(category) = category {
                let category_ids = AssetCategoryRepository::new(&self.connection)
                    .query_by_filter(AssetCategoryFilter::new().name(category))?
                    .iter()
                    .map(|c| c.id.clone())
                    .collect::<Vec<String>>();
                query =
                    query.filter(asset_catalogue_item_dsl::asset_category_id.eq_any(category_ids));
            }

            if let Some(class) = class {
                let class_ids = AssetClassRepository::new(&self.connection)
                    .query_by_filter(AssetClassFilter::new().name(class))?
                    .iter()
                    .map(|c| c.asset_class_row.id.clone())
                    .collect::<Vec<String>>();
                query = query.filter(asset_catalogue_item_dsl::asset_class_id.eq_any(class_ids));
            }

            if let Some(asset_type) = r#type {
                let type_ids = AssetTypeRepository::new(&self.connection)
                    .query_by_filter(AssetTypeFilter::new().name(asset_type))?
                    .iter()
                    .map(|c| c.asset_type_row.id.clone())
                    .collect::<Vec<String>>();
                query = query.filter(asset_catalogue_item_dsl::asset_type_id.eq_any(type_ids));
            }
        }
        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<AssetCatalogueItemRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedAssetCatalogueItemQuery = asset_catalogue_item::BoxedQuery<'static, DBType>;

pub fn to_domain(asset_catalogue_item_row: AssetCatalogueItemRow) -> AssetCatalogueItem {
    AssetCatalogueItem {
        asset_catalogue_item_row,
    }
}

fn create_filtered_query(filter: Option<AssetCatalogueItemFilter>) -> BoxedAssetCatalogueItemQuery {
    let mut query = asset_catalogue_item_dsl::asset_catalogue_item.into_boxed();

    if let Some(f) = filter {
        let AssetCatalogueItemFilter {
            id,
            code,
            manufacturer,
            model,
            ..
        } = f;

        apply_equal_filter!(query, id, asset_catalogue_item_dsl::id);
        apply_string_filter!(query, code, asset_catalogue_item_dsl::code);
        apply_string_filter!(query, manufacturer, asset_catalogue_item_dsl::manufacturer);
        apply_string_filter!(query, model, asset_catalogue_item_dsl::model);
    }
    query
}

impl AssetCatalogueItemFilter {
    pub fn new() -> AssetCatalogueItemFilter {
        AssetCatalogueItemFilter {
            id: None,
            category: None,
            category_id: None,
            class: None,
            class_id: None,
            code: None,
            manufacturer: None,
            model: None,
            r#type: None,
            type_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn category(mut self, filter: StringFilter) -> Self {
        self.category = Some(filter);
        self
    }

    pub fn category_id(mut self, filter: EqualFilter<String>) -> Self {
        self.category_id = Some(filter);
        self
    }

    pub fn class(mut self, filter: StringFilter) -> Self {
        self.class = Some(filter);
        self
    }

    pub fn class_id(mut self, filter: EqualFilter<String>) -> Self {
        self.class_id = Some(filter);
        self
    }

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn manufacturer(mut self, filter: StringFilter) -> Self {
        self.manufacturer = Some(filter);
        self
    }

    pub fn model(mut self, filter: StringFilter) -> Self {
        self.model = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: StringFilter) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn type_id(mut self, filter: EqualFilter<String>) -> Self {
        self.type_id = Some(filter);
        self
    }
}
