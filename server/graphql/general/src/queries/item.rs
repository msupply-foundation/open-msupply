use async_graphql::*;
use graphql_core::{
    dynamic_filter::{parse_dynamic_filter, validate_custom_field_filter_keys},
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{ItemConnector, ItemNodeType};
use repository::{EqualFilter, ItemType, PaginationOption, StringFilter};
use repository::{ItemCondition, ItemFilter, ItemSort, ItemSortField};
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::get_items,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::ItemSortField")]
pub enum ItemSortFieldInput {
    Name,
    Code,
    Type,
}

#[derive(InputObject)]
pub struct ItemSortInput {
    /// Sort query result by `key`
    key: ItemSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterItemTypeInput {
    pub equal_to: Option<ItemNodeType>,
    pub equal_any: Option<Vec<ItemNodeType>>,
    pub not_equal_to: Option<ItemNodeType>,
    pub not_equal_all: Option<Vec<ItemNodeType>>,
}

#[derive(InputObject, Clone)]
pub struct ItemFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub r#type: Option<EqualFilterItemTypeInput>,
    pub code: Option<StringFilterInput>,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    /// Items that are part of a masterlist which is visible in this store OR there is available stock of that item in this store
    pub is_visible_or_on_hand: Option<bool>,
    /// Items that are part of a masterlist which is visible in this store. This filter is ignored if `is_visible_or_on_hand` is true
    pub is_visible: Option<bool>,
    /// Items with available stock on hand, regardless of item visibility. This filter is ignored if `is_visible_or_on_hand` is true
    pub has_stock_on_hand: Option<bool>,
    pub code_or_name: Option<StringFilterInput>,
    pub is_active: Option<bool>,
    pub is_vaccine: Option<bool>,
    pub master_list_id: Option<EqualFilterStringInput>,
    pub is_program_item: Option<bool>,
    pub ignore_for_orders: Option<bool>,
    pub min_months_of_stock: Option<f64>,
    pub max_months_of_stock: Option<f64>,
    pub with_recent_consumption: Option<bool>,
    pub products_at_risk_of_being_out_of_stock: Option<bool>,
    pub universal_code: Option<StringFilterInput>,

    /// Dynamic filter condition AST, currently supporting property conditions
    /// on keys visible for the "item" table scope, e.g.
    /// `{"And": [{"CustomField": {"key": "k", "filter": {"Text": {"Like": "abc"}}}}]}`
    pub dynamic_filter: Option<serde_json::Value>,
}

#[derive(Union)]
pub enum ItemsResponse {
    Response(ItemConnector),
}

pub fn items(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ItemFilterInput>,
    sort: Option<Vec<ItemSortInput>>,
) -> Result<ItemsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
            require_central_standalone: false,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();

    let filter = filter
        .map(|filter| -> Result<ItemFilter> {
            let dynamic_filter: Option<ItemCondition::Inner> =
                parse_dynamic_filter(filter.dynamic_filter.clone())?;
            if let Some(condition) = &dynamic_filter {
                let connection = connection_manager
                    .connection()
                    .map_err(StandardGraphqlError::from_repository_error)?;
                validate_custom_field_filter_keys(
                    &connection,
                    "item",
                    &condition.custom_field_conditions(),
                )?;
            }
            let mut filter = filter.to_domain();
            filter.dynamic_filter = dynamic_filter;
            Ok(filter)
        })
        .transpose()?;

    let items = get_items(
        connection_manager,
        page.map(PaginationOption::from),
        filter,
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
        &store_id,
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ItemsResponse::Response(ItemConnector::from_domain(items)))
}

impl ItemFilterInput {
    pub fn to_domain(self) -> ItemFilter {
        let ItemFilterInput {
            id,
            name,
            r#type,
            code,
            category_id,
            category_name,
            is_visible,
            code_or_name,
            is_active,
            is_vaccine,
            has_stock_on_hand,
            is_visible_or_on_hand,
            master_list_id,
            is_program_item,
            ignore_for_orders,
            min_months_of_stock,
            max_months_of_stock,
            with_recent_consumption,
            products_at_risk_of_being_out_of_stock,
            universal_code,
            // Parsed and validated in the resolver, not here (to_domain is infallible)
            dynamic_filter: _,
        } = self;

        ItemFilter {
            id: id.map(EqualFilter::from),
            name: name.map(StringFilter::from),
            code: code.map(StringFilter::from),
            r#type: r#type.map(|t| map_filter!(t, ItemType::from)),
            category_id,
            category_name,
            is_visible,
            code_or_name: code_or_name.map(StringFilter::from),
            is_active,
            is_vaccine,
            has_stock_on_hand,
            is_visible_or_on_hand,
            master_list_id: master_list_id.map(EqualFilter::from),
            is_program_item,
            ignore_for_orders,
            min_months_of_stock,
            max_months_of_stock,
            with_recent_consumption,
            products_at_risk_of_being_out_of_stock,
            universal_code: universal_code.map(StringFilter::from),
            // Parsed from the JSON `dynamicFilter` input in the resolver (a
            // serde error there must surface as BadUserInput, so the infallible
            // to_domain can't do it)
            dynamic_filter: None,
        }
    }
}

impl ItemSortInput {
    pub fn to_domain(self) -> ItemSort {
        ItemSort {
            key: ItemSortField::from(self.key),
            desc: self.desc,
        }
    }
}
