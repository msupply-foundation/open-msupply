use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::StorePreferenceRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    store_preference::get_store_preferences,
};

#[derive(PartialEq, Debug)]
pub struct StorePreferenceNode {
    store_preference: StorePreferenceRow,
}

#[Object]
impl StorePreferenceNode {
    pub async fn id(&self) -> &str {
        &self.store_preference.id
    }

    pub async fn pack_to_one(&self) -> &bool {
        &self.store_preference.pack_to_one
    }
    pub async fn use_authorisation_for_customer_requisitions(&self) -> &bool {
        &self
            .store_preference
            .use_authorisation_for_customer_requisitions
    }
    pub async fn requisitions_require_supplier_authorisation(&self) -> &bool {
        &self
            .store_preference
            .requisitions_require_supplier_authorisation
    }
}

pub(crate) fn store_preferences(ctx: &Context<'_>, store_id: &str) -> Result<StorePreferenceNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStorePreferences,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let connection = ctx.get_connection_manager().connection()?;
    let store_preference = get_store_preferences(&connection, store_id)?;
    Ok(StorePreferenceNode { store_preference })
}
