use super::{
    asset_catalogue_row::{
        asset_catalogue, asset_catalogue::dsl as asset_catalogue_dsl, AssetCatalogueRow,
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
pub struct AssetCatalogue {
    pub asset_catalogue_row: AssetCatalogueRow,
}

#[derive(Clone, PartialEq, Debug)]
pub struct AssetCatalogueFilter {
    pub id: Option<EqualFilter<String>>,
    pub category: Option<StringFilter>,
    pub class: Option<StringFilter>,
    pub code: Option<StringFilter>,
    pub manufacturer: Option<StringFilter>,
    pub model: Option<StringFilter>,
    pub r#type: Option<StringFilter>,
}

#[derive(PartialEq, Debug)]
pub enum AssetCatalogueSortField {
    Catalogue,
    Code,
    Make,
    Model,
}

pub type AssetCatalogueSort = Sort<AssetCatalogueSortField>;

pub struct AssetCatalogueRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AssetCatalogueRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AssetCatalogueRepository { connection }
    }

    pub fn count(&self, filter: Option<AssetCatalogueFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: AssetCatalogueFilter,
    ) -> Result<Vec<AssetCatalogue>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetCatalogueFilter>,
        sort: Option<AssetCatalogueSort>,
    ) -> Result<Vec<AssetCatalogue>, RepositoryError> {
        let mut query = create_filtered_query(filter.clone());

        if let Some(sort) = sort {
            match sort.key {
                AssetCatalogueSortField::Catalogue => {
                    apply_sort_no_case!(query, sort, asset_catalogue_dsl::id)
                }
                AssetCatalogueSortField::Code => {
                    apply_sort_no_case!(query, sort, asset_catalogue_dsl::code)
                }
                AssetCatalogueSortField::Make => {
                    apply_sort_no_case!(query, sort, asset_catalogue_dsl::manufacturer)
                }
                AssetCatalogueSortField::Model => {
                    apply_sort_no_case!(query, sort, asset_catalogue_dsl::model)
                }
            }
        } else {
            query = query.order(asset_catalogue_dsl::id.asc())
        }
        if let Some(f) = filter {
            let AssetCatalogueFilter {
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
                query = query.filter(asset_catalogue_dsl::asset_category_id.eq_any(category_ids));
            }

            if let Some(class) = class {
                let class_ids = AssetClassRepository::new(&self.connection)
                    .query_by_filter(AssetClassFilter::new().name(class))?
                    .iter()
                    .map(|c| c.id.clone())
                    .collect::<Vec<String>>();
                query = query.filter(asset_catalogue_dsl::asset_class_id.eq_any(class_ids));
            }

            if let Some(asset_type) = r#type {
                let type_ids = AssetTypeRepository::new(&self.connection)
                    .query_by_filter(AssetTypeFilter::new().name(asset_type))?
                    .iter()
                    .map(|c| c.id.clone())
                    .collect::<Vec<String>>();
                query = query.filter(asset_catalogue_dsl::asset_type_id.eq_any(type_ids));
            }
        }
        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<AssetCatalogueRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedAssetCatalogueQuery = asset_catalogue::BoxedQuery<'static, DBType>;

pub fn to_domain(asset_catalogue_row: AssetCatalogueRow) -> AssetCatalogue {
    AssetCatalogue {
        asset_catalogue_row,
    }
}

fn create_filtered_query(filter: Option<AssetCatalogueFilter>) -> BoxedAssetCatalogueQuery {
    let mut query = asset_catalogue_dsl::asset_catalogue.into_boxed();

    if let Some(f) = filter {
        let AssetCatalogueFilter {
            id,
            code,
            manufacturer,
            model,
            ..
        } = f;

        apply_equal_filter!(query, id, asset_catalogue_dsl::id);
        apply_string_filter!(query, code, asset_catalogue_dsl::code);
        apply_string_filter!(query, manufacturer, asset_catalogue_dsl::manufacturer);
        apply_string_filter!(query, model, asset_catalogue_dsl::model);
    }
    query
}

impl AssetCatalogueFilter {
    pub fn new() -> AssetCatalogueFilter {
        AssetCatalogueFilter {
            id: None,
            category: None,
            class: None,
            code: None,
            manufacturer: None,
            model: None,

            r#type: None,
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

    pub fn class(mut self, filter: StringFilter) -> Self {
        self.class = Some(filter);
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
}
