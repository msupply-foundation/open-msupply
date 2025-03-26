use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{
    PreferenceDescriptionNode, PreferenceNode, PreferencesByKeyNode, PreferencesNode,
};
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

        let prefs = service.get_preferences(&service_ctx, &store_id)?;

        Ok(PreferencesNode::from_domain(prefs))
    }

    pub async fn available_preferences(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Vec<PreferenceDescriptionNode>> {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryStorePreferences,
                store_id: None,
            },
        )?;

        let service_provider = ctx.service_provider();
        let service = &service_provider.preference_service;

        let prefs = service.get_preference_descriptions();

        Ok(prefs
            .iter()
            .map(|pref| PreferenceDescriptionNode {
                key: pref.key(),
                global_only: pref.global_only(),
                json_forms_input_type: pref.json_forms_input_type(),
                serialised_default: pref.serialised_default(),
            })
            .collect())
    }
}

pub struct CentralPreferenceQueries;
#[Object]
impl CentralPreferenceQueries {
    pub async fn preferences_by_key(
        &self,
        ctx: &Context<'_>,
        key: String,
    ) -> Result<PreferencesByKeyNode> {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::MutatePreferences,
                store_id: None,
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.basic_context()?;
        let service = &service_provider.preference_service;

        let result = service.get_preferences_by_key(&service_ctx, &key)?;

        Ok(PreferencesByKeyNode { result })
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
        input: UpsertPreferenceInput,
    ) -> Result<PreferenceNode> {
        upsert_preference(ctx, store_id, input)
    }
}
