use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{InventoryAdjustmentReasonConnector, InventoryAdjustmentReasonNodeType};
use repository::{
    inventory_adjustment_reason::{
        InventoryAdjustmentReasonFilter, InventoryAdjustmentReasonSort,
        InventoryAdjustmentReasonSortField,
    },
    EqualFilter, PaginationOption,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    inventory_adjustment_reason::get_inventory_adjustment_reasons,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::inventory_adjustment_reason::InventoryAdjustmentReasonSortField")]
#[graphql(rename_items = "camelCase")]
pub enum InventoryAdjustmentReasonSortFieldInput {
    Id,
    InventoryAdjustmentReasonType,
    Reason,
}

#[derive(InputObject)]
pub struct InventoryAdjustmentReasonSortInput {
    /// Sort query result by `key`
    key: InventoryAdjustmentReasonSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterInventoryAdjustmentReasonTypeInput {
    pub equal_to: Option<InventoryAdjustmentReasonNodeType>,
    pub equal_any: Option<Vec<InventoryAdjustmentReasonNodeType>>,
    pub not_equal_to: Option<InventoryAdjustmentReasonNodeType>,
}

#[derive(InputObject, Clone)]
pub struct InventoryAdjustmentReasonFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterInventoryAdjustmentReasonTypeInput>,
    pub is_active: Option<bool>,
}

#[derive(Union)]
pub enum InventoryAdjustmentReasonResponse {
    Response(InventoryAdjustmentReasonConnector),
}

pub fn inventory_adjustment_reasons(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<InventoryAdjustmentReasonFilterInput>,
    sort: Option<Vec<InventoryAdjustmentReasonSortInput>>,
) -> Result<InventoryAdjustmentReasonResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryInventoryAdjustmentReasons,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let items = get_inventory_adjustment_reasons(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(InventoryAdjustmentReasonResponse::Response(
        InventoryAdjustmentReasonConnector::from_domain(items),
    ))
}

impl InventoryAdjustmentReasonFilterInput {
    pub fn to_domain(self) -> InventoryAdjustmentReasonFilter {
        let InventoryAdjustmentReasonFilterInput {
            id,
            r#type,
            is_active,
        } = self;

        InventoryAdjustmentReasonFilter {
            id: id.map(EqualFilter::from),
            r#type: r#type.map(|t| map_filter!(t, InventoryAdjustmentReasonNodeType::to_domain)),
            is_active,
            include_system_reasons: None,
        }
    }
}

impl InventoryAdjustmentReasonSortInput {
    pub fn to_domain(self) -> InventoryAdjustmentReasonSort {
        use InventoryAdjustmentReasonSortField as to;
        use InventoryAdjustmentReasonSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::InventoryAdjustmentReasonType => to::InventoryAdjustmentReasonType,
            from::Reason => to::Reason,
        };

        InventoryAdjustmentReasonSort {
            key,
            desc: self.desc,
        }
    }
}
