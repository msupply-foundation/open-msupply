use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{PreferenceDescriptionNode, PreferencesNode};
use service::auth::{Resource, ResourceAccessRequest};

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
                store_id: None,
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
            })
            .collect())
    }
}

// --
// TODO: mutations from central only UI

// #[derive(Default, Clone)]
// pub struct PreferenceMutations;

// #[Object]
// impl PreferenceMutations {
//     async fn upsert_preferences(
//         &self,
//         ctx: &Context<'_>,
//         store_id: String,
//         input: UpdatePreferenceInput,
//     ) -> Result<UpdatePreferenceResponse> {
//         update_preference(ctx, &store_id, input)
//     }

//     // needed? or always just "clear"?
//     async fn delete_preference(
//         &self,
//         ctx: &Context<'_>,
//         preference_id: String,
//     ) -> Result<DeletePreferenceResponse> {
//         delete_preference(ctx, &preference_id)
//     }
// }
