use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::StorePreferenceNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    store_preference::get_store_preferences,
};

pub(crate) fn store_preferences(ctx: &Context<'_>, store_id: &str) -> Result<StorePreferenceNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStorePreferences,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let connection = ctx.get_connection_manager().connection()?;
    let result =
        get_store_preferences(&connection, store_id).map(StorePreferenceNode::from_domain)?;

    Ok(result)
}
