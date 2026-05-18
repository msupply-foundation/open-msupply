use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    OkResponse, PreferenceDescriptionNode, PreferenceNodeType, PreferencesNode,
};
use repository::RepositoryError;
use service::{
    auth::{Resource, ResourceAccessRequest},
    preference::{PreferenceError, PreferenceType},
};

mod upsert;
use upsert::*;

#[derive(Default, Clone)]
pub struct PreferenceQueries;
#[Object]
impl PreferenceQueries {
    /// Returns the relevant set of preferences based on context (e.g. current store)
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

        let service_provider = ctx.service_provider_data();

        tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
            let service_ctx = service_provider.context(store_id.clone(), user.user_id)?;
            let service = &service_provider.preference_service;

            // Instead of all service/DB calls, errors handled here, we just get registry
            let pref_registry = service.get_preference_provider();

            // Loading (DB call) of each pref is done in the node resolver, so we only query for the
            // prefs we need
            Ok(PreferencesNode::from_domain(
                service_ctx.connection,
                Some(store_id),
                pref_registry,
            ))
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(Into::into)
    }

    /// The list of preferences and their current values (used for the admin/edit page)
    pub async fn preference_descriptions(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        pref_type: PreferenceNodeType,
        pref_context: PreferenceDescriptionContext,
    ) -> Result<Vec<PreferenceDescriptionNode>> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryStore,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider_data();
        let pref_context_store_id = pref_context.store_id;

        let prefs = tokio::task::spawn_blocking(move || -> Result<_, PreferenceError> {
            let service_context = service_provider.context(store_id, user.user_id)?;
            let service = &service_provider.preference_service;

            service.get_preference_descriptions(
                service_context.connection,
                pref_context_store_id,
                PreferenceType::from(pref_type),
            )
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)??;

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
    pub async fn upsert_preferences(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpsertPreferencesInput,
    ) -> Result<OkResponse> {
        upsert_preferences(ctx, store_id, input).await.map_err(|err| {
            log::error!("Error upserting preferences: {err:?}");
            err
        })?;

        Ok(OkResponse)
    }
}

#[derive(InputObject)]
/// The context we are editing pref within (e.g. prefs for given store, user, etc.)
pub struct PreferenceDescriptionContext {
    pub store_id: Option<String>,
}
