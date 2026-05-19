use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{
    PropertyNode, PropertyParentTableEnum, PropertyValueNode,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    property::{get_all_properties, get_properties_for_table, get_property, get_property_values},
};

use crate::mutations::property_errors::property_service_error_to_graphql;

pub fn properties_for_table(
    ctx: &Context<'_>,
    table: PropertyParentTableEnum,
) -> Result<Vec<PropertyNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProperty,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let rows = get_properties_for_table(connection_manager, table.into())
        .map_err(property_service_error_to_graphql)?;
    Ok(rows.into_iter().map(PropertyNode::from_domain).collect())
}

pub fn properties(ctx: &Context<'_>) -> Result<Vec<PropertyNode>> {
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
    let rows = get_all_properties(connection_manager).map_err(property_service_error_to_graphql)?;
    Ok(rows.into_iter().map(PropertyNode::from_domain).collect())
}

pub fn property_by_id(ctx: &Context<'_>, id: String) -> Result<Option<PropertyNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPropertyConfig,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let row = get_property(connection_manager, &id).map_err(property_service_error_to_graphql)?;
    Ok(row.map(PropertyNode::from_domain))
}

pub fn property_values(
    ctx: &Context<'_>,
    table: PropertyParentTableEnum,
    record_id: String,
) -> Result<Vec<PropertyValueNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProperty,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let values = get_property_values(connection_manager, table.into(), &record_id)
        .map_err(property_service_error_to_graphql)?;
    Ok(PropertyValueNode::from_vec(values))
}
