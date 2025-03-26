use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::PreferencesNode;
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
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_ctx = service_provider.context(store_id.to_string(), user.user_id)?;
        let service = &service_provider.preference_service;

        let prefs = service.get_preferences(&service_ctx, &store_id)?;

        Ok(PreferencesNode::from_domain(prefs))
    }
}

// TODO: separate query for central edit UI - all prefs, global and for each store, rather than the consolidated list

// #[derive(Default, Clone)]
// pub struct CentralPreferenceQueries;
// #[Object]
// impl CentralPreferenceQueries {
//     pub async fn preferences(
//         &self,
//         ctx: &Context<'_>,
//         store_id: String,
//     ) -> Result<PreferencesResponse> {
//         validate_auth(
//             ctx,
//             &ResourceAccessRequest {
//                 resource: Resource::QueryVaccineCourse,
//                 store_id: None,
//             },
//         )?;
//         let connection = ctx.get_connection_manager().connection()?;
//         let items = get_preferences(&connection, store_id)
//             .map_err(StandardGraphqlError::from_list_error)?;

//         Ok(VaccineCoursesResponse::Response(
//             VaccineCourseConnector::from_domain(items),
//         ))
//     }
// }

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
