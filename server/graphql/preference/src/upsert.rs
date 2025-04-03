use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::PreferenceNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    preference::UpsertPreference,
};

#[derive(InputObject)]
pub struct UpsertPreferenceInput {
    pub id: String,
    pub key: String,
    pub value: String,
    pub store_id: Option<String>,
}

pub fn upsert_preference(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertPreferenceInput,
) -> Result<PreferenceNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePreferences,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let preference = service_provider
        .preference_service
        .upsert(&service_context, input.to_domain())?;

    Ok(PreferenceNode { preference })
}

impl UpsertPreferenceInput {
    pub fn to_domain(self) -> UpsertPreference {
        let UpsertPreferenceInput {
            id,
            key,
            value,
            store_id,
        } = self;

        UpsertPreference {
            id,
            key,
            value,
            store_id,
        }
    }
}
