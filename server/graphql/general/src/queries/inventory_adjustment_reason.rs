use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{InventoryAdjustmentReasonConnector, InventoryAdjustmentReasonNodeType};
use repository::{
    EqualFilter, PaginationOption, ReasonOptionFilter, ReasonOptionSort, ReasonOptionSortField,
    ReasonOptionType,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    reason_option::get_reason_options,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
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
    pub not_equal_all: Option<Vec<InventoryAdjustmentReasonNodeType>>,
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
            resource: Resource::QueryReasonOptions,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let items = get_reason_options(
        connection_manager,
        page.map(PaginationOption::from),
        Some(map_inventory_adjustment_reason_filter(filter)),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(InventoryAdjustmentReasonResponse::Response(
        InventoryAdjustmentReasonConnector::from_domain(items),
    ))
}

// Map from InventoryAdjustmentReasonFilter => ReasonOptionFilter
fn map_inventory_adjustment_reason_filter(
    filter: Option<InventoryAdjustmentReasonFilterInput>,
) -> ReasonOptionFilter {
    let inventory_adjustment_reason_type_filter = EqualFilter {
        equal_any: Some(vec![
            ReasonOptionType::PositiveInventoryAdjustment,
            ReasonOptionType::NegativeInventoryAdjustment,
        ]),
        ..Default::default()
    };

    let base_filter = ReasonOptionFilter {
        id: None,
        r#type: Some(inventory_adjustment_reason_type_filter.clone()),
        is_active: None,
    };

    match filter {
        Some(filter) => ReasonOptionFilter {
            id: filter.id.map(EqualFilter::from),
            is_active: filter.is_active,
            r#type: Some(
                filter
                    .r#type
                    .map_or(inventory_adjustment_reason_type_filter, |r#type| {
                        EqualFilter {
                            equal_to: r#type
                                .equal_to
                                .map(InventoryAdjustmentReasonNodeType::to_domain),
                            not_equal_to: r#type
                                .not_equal_to
                                .map(InventoryAdjustmentReasonNodeType::to_domain),
                            equal_any: r#type.equal_any.map(|v| {
                                v.into_iter()
                                    .map(InventoryAdjustmentReasonNodeType::to_domain)
                                    .collect()
                            }),
                            equal_any_or_null: None,
                            not_equal_all: None,
                            not_equal_to_or_null: None,
                            is_null: None,
                        }
                    }),
            ),
        },
        None => base_filter,
    }
}

impl InventoryAdjustmentReasonSortInput {
    pub fn to_domain(self) -> ReasonOptionSort {
        use InventoryAdjustmentReasonSortFieldInput as from;
        use ReasonOptionSortField as to;
        let key = match self.key {
            from::Id => to::Reason, // TODO: Implement sort by ID for ReasonOptionSortField or remove from InventoryAdjustmentReasonSortField
            from::InventoryAdjustmentReasonType => to::ReasonOptionType,
            from::Reason => to::Reason,
        };

        ReasonOptionSort {
            key,
            desc: self.desc,
        }
    }
}
