use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{PropertyV2Node, PropertyV2ParentTableEnum, PropertyV2ValueNode};
use service::{
    auth::{Resource, ResourceAccessRequest},
    property_v2::{
        get_all_properties_v2, get_properties_v2_for_table, get_property_v2,
        get_property_v2_values,
    },
};

use crate::mutations::property_errors::property_service_error_to_graphql;

pub fn properties_for_table(
    ctx: &Context<'_>,
    table: PropertyV2ParentTableEnum,
) -> Result<Vec<PropertyV2Node>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProperty,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let rows = get_properties_v2_for_table(connection_manager, table.into())
        .map_err(property_service_error_to_graphql)?;
    Ok(rows.into_iter().map(PropertyV2Node::from_domain).collect())
}

pub fn properties(ctx: &Context<'_>) -> Result<Vec<PropertyV2Node>> {
    // Admin-list query — gated on central server edit access. Per-record paths
    // use Resource::QueryProperty (less strict).
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPropertyConfig,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let rows =
        get_all_properties_v2(connection_manager).map_err(property_service_error_to_graphql)?;
    Ok(rows.into_iter().map(PropertyV2Node::from_domain).collect())
}

pub fn property_by_id(ctx: &Context<'_>, id: String) -> Result<Option<PropertyV2Node>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPropertyConfig,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let row =
        get_property_v2(connection_manager, &id).map_err(property_service_error_to_graphql)?;
    Ok(row.map(PropertyV2Node::from_domain))
}

pub fn property_values(
    ctx: &Context<'_>,
    table: PropertyV2ParentTableEnum,
    record_id: String,
) -> Result<Vec<PropertyV2ValueNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProperty,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let values = get_property_v2_values(connection_manager, table.into(), &record_id)
        .map_err(property_service_error_to_graphql)?;
    Ok(PropertyV2ValueNode::from_vec(values))
}
