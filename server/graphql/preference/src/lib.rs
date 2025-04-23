use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{PreferenceDescriptionNode, PreferenceNode, PreferencesNode};
use service::auth::{Resource, ResourceAccessRequest};

mod upsert;
use upsert::*;

#[derive(Default, Clone)]
pub struct PreferenceQueries;
#[Object]
impl PreferenceQueries {
    pub async fn preferences(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<PreferencesNode> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryStorePreferences,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context(store_id.to_string(), user.user_id)?;
        let service = &service_provider.preference_service;

        // Instead of all service/DB calls, errors handled here, we just get registry
        let pref_registry = service.get_preference_registry();

        // Loading (DB call) of each pref is done in the node resolver, so we only query for the
        // prefs we need
        Ok(PreferencesNode::from_domain(
            service_ctx.connection,
            Some(store_id),
            pref_registry,
        ))
    }

    pub async fn preference_list(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        // TODO: filter (store prefs, global prefs, etc)
    ) -> Result<Vec<PreferenceDescriptionNode>> {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryStorePreferences,
                store_id: Some(store_id),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service = &service_provider.preference_service;

        let prefs = service.get_preference_descriptions();

        Ok(prefs
            .into_iter()
            .map(|pref| PreferenceDescriptionNode { pref })
            .collect())
    }
}

// --
// mutations from central only UI

#[derive(Default, Clone)]
pub struct PreferenceMutations;

#[Object]
impl PreferenceMutations {
    pub async fn upsert_preference(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        // TODO: upsert should have defined input types for each pref
        input: UpsertPreferenceInput,
    ) -> Result<PreferenceNode> {
        upsert_preference(ctx, store_id, input)
    }
}
