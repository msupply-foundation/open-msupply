use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::{StorePreferenceRow, StorePreferenceType};
use service::{
    auth::{Resource, ResourceAccessRequest},
    store_preference::get_store_preferences,
};

#[derive(PartialEq, Debug)]
pub struct StorePreferenceNode {
    store_preference: StorePreferenceRow,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum StorePreferenceNodeType {
    StorePreference,
}

#[Object]
impl StorePreferenceNode {
    pub async fn id(&self) -> &str {
        &self.store_preference.id
    }

    pub async fn pack_to_one(&self) -> &bool {
        &self.store_preference.pack_to_one
    }
}

impl StorePreferenceNodeType {
    pub fn from_domain(from: &StorePreferenceType) -> StorePreferenceNodeType {
        match from {
            StorePreferenceType::StorePreferences => StorePreferenceNodeType::StorePreference,
        }
    }

    pub fn to_domain(self) -> StorePreferenceType {
        match self {
            StorePreferenceNodeType::StorePreference => StorePreferenceType::StorePreferences,
        }
    }
}

pub(crate) fn store_preferences(ctx: &Context<'_>, store_id: &str) -> Result<StorePreferenceNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStorePreferences,
            store_id: None,
        },
    )?;

    let connection = ctx.get_connection_manager().connection()?;
    let store_preference = get_store_preferences(&connection, store_id)?;
    Ok(StorePreferenceNode { store_preference })
}
