use super::asset_catalogue_item_row::{
    asset_catalogue_item, asset_catalogue_item::dsl as asset_catalogue_item_dsl,
    AssetCatalogueItemRow,
};

use crate::{
    asset_class_row::asset_class::dsl as asset_class_dsl,
    diesel_macros::{
        apply_equal_filter, apply_sort_no_case, apply_string_filter, apply_string_or_filter,
    },
    StorageConnection, StringFilter,
};

use crate::asset_category_row::asset_category::dsl as asset_category_dsl;
use crate::asset_type_row::asset_catalogue_type::dsl as asset_type_dsl;

use crate::{repository_error::RepositoryError, DBType, EqualFilter, Pagination, Sort};
use diesel::prelude::*;

#[derive(Clone, PartialEq, Debug, Default)]
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
    pub search: Option<StringFilter>,
    pub sub_catalogue: Option<StringFilter>,
}

#[derive(PartialEq, Debug)]
pub enum AssetCatalogueItemSortField {
    Catalogue,
    Code,
    Manufacturer,
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

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: AssetCatalogueItemFilter,
    ) -> Result<Vec<AssetCatalogueItemRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<AssetCatalogueItemFilter>,
        sort: Option<AssetCatalogueItemSort>,
    ) -> Result<Vec<AssetCatalogueItemRow>, RepositoryError> {
        let mut query = create_filtered_query(filter.clone());

        if let Some(sort) = sort {
            match sort.key {
                AssetCatalogueItemSortField::Catalogue => {
                    apply_sort_no_case!(query, sort, asset_catalogue_item_dsl::sub_catalogue)
                }
                AssetCatalogueItemSortField::Code => {
                    apply_sort_no_case!(query, sort, asset_catalogue_item_dsl::code)
                }
                AssetCatalogueItemSortField::Manufacturer => {
                    apply_sort_no_case!(query, sort, asset_catalogue_item_dsl::manufacturer)
                }
                AssetCatalogueItemSortField::Model => {
                    apply_sort_no_case!(query, sort, asset_catalogue_item_dsl::model)
                }
            }
        } else {
            query = query.order(asset_catalogue_item_dsl::id.asc())
        }

        query = query.filter(asset_catalogue_item_dsl::deleted_datetime.is_null());

        // // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<AssetCatalogueItemRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedAssetCatalogueItemQuery = asset_catalogue_item::BoxedQuery<'static, DBType>;

pub fn to_domain(asset_catalogue_item_row: AssetCatalogueItemRow) -> AssetCatalogueItemRow {
    asset_catalogue_item_row
}

fn create_filtered_query(filter: Option<AssetCatalogueItemFilter>) -> BoxedAssetCatalogueItemQuery {
    let mut query = asset_catalogue_item_dsl::asset_catalogue_item
        .filter(asset_catalogue_item_dsl::deleted_datetime.is_null())
        .into_boxed();

    if let Some(f) = filter {
        let AssetCatalogueItemFilter {
            id,
            code,
            manufacturer,
            model,
            category,
            category_id,
            class,
            class_id,
            r#type,
            type_id,
            search,
            sub_catalogue,
        } = f;

        // or filter need to be applied before and filters
        if search.is_some() {
            let mut sub_query = asset_type_dsl::asset_catalogue_type
                .select(asset_type_dsl::id)
                .into_boxed();
            apply_string_filter!(sub_query, search.clone(), asset_type_dsl::name);

            query =
                query.filter(asset_catalogue_item_dsl::asset_catalogue_type_id.eq_any(sub_query));
            apply_string_or_filter!(query, search.clone(), asset_catalogue_item_dsl::code);
            apply_string_or_filter!(
                query,
                search.clone(),
                asset_catalogue_item_dsl::manufacturer
            );
            apply_string_or_filter!(query, search, asset_catalogue_item_dsl::model);
        }

        apply_equal_filter!(query, id, asset_catalogue_item_dsl::id);
        apply_string_filter!(query, code, asset_catalogue_item_dsl::code);
        apply_string_filter!(query, manufacturer, asset_catalogue_item_dsl::manufacturer);
        apply_string_filter!(query, model, asset_catalogue_item_dsl::model);
        apply_string_filter!(
            query,
            sub_catalogue,
            asset_catalogue_item_dsl::sub_catalogue
        );
        apply_equal_filter!(
            query,
            category_id,
            asset_catalogue_item_dsl::asset_category_id
        );
        apply_equal_filter!(query, class_id, asset_catalogue_item_dsl::asset_class_id);
        apply_equal_filter!(
            query,
            type_id,
            asset_catalogue_item_dsl::asset_catalogue_type_id
        );

        if let Some(class_filter) = class {
            let mut sub_query = asset_class_dsl::asset_class
                .select(asset_class_dsl::id)
                .into_boxed();
            apply_string_filter!(sub_query, Some(class_filter), asset_class_dsl::name);
            query = query.filter(asset_catalogue_item_dsl::asset_class_id.eq_any(sub_query));
        }

        if let Some(r#type_filter) = r#type {
            let mut sub_query = asset_type_dsl::asset_catalogue_type
                .select(asset_type_dsl::id)
                .into_boxed();
            apply_string_filter!(sub_query, Some(r#type_filter), asset_type_dsl::name);
            query =
                query.filter(asset_catalogue_item_dsl::asset_catalogue_type_id.eq_any(sub_query));
        }

        if let Some(category_filter) = category {
            let mut sub_query = asset_category_dsl::asset_category
                .select(asset_category_dsl::id)
                .into_boxed();
            apply_string_filter!(sub_query, Some(category_filter), asset_category_dsl::name);
            query = query.filter(asset_catalogue_item_dsl::asset_category_id.eq_any(sub_query));
        }
    }
    query
}

impl AssetCatalogueItemFilter {
    pub fn new() -> AssetCatalogueItemFilter {
        Self::default()
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

    pub fn sub_catalogue(mut self, filter: StringFilter) -> Self {
        self.sub_catalogue = Some(filter);
        self
    }
}
