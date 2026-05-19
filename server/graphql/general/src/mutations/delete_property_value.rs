use async_graphql::*;

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::PropertyParentTableEnum;
use service::{
    auth::{Resource, ResourceAccessRequest},
    property::delete_property_value,
};

use crate::mutations::property_errors::property_service_error_to_graphql;

pub fn delete_property_value_mutation(
    ctx: &Context<'_>,
    table: PropertyParentTableEnum,
    record_id: String,
    property_id: String,
) -> Result<bool> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProperty,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    delete_property_value(connection_manager, table.into(), &record_id, &property_id)
        .map_err(property_service_error_to_graphql)
}
