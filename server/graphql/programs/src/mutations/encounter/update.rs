use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::encounter::EncounterNode;
use repository::{Encounter, EncounterFilter, EqualFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::encounter::{UpdateEncounter, UpdateEncounterError},
};

#[derive(InputObject)]
pub struct UpdateEncounterInput {
    /// The encounter type
    pub r#type: String,
    /// Encounter document data
    pub data: serde_json::Value,
    /// The schema id used for the encounter data
    pub schema_id: String,
    /// The document id of the encounter document which should be updated
    pub parent: String,
}

#[derive(Union)]
pub enum UpdateEncounterResponse {
    Response(EncounterNode),
}

pub async fn update_encounter(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdateEncounterInput,
) -> Result<UpdateEncounterResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateEncounter,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();
    let store_id_for_response = store_id.clone();
    let allowed_ctx_for_response = allowed_ctx.clone();
    let user_id = user.user_id.clone();

    let encounter = tokio::task::spawn_blocking(move || -> async_graphql::Result<Encounter> {
        let service_context = service_provider
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;

        let document = match service_provider.encounter_service.update_encounter(
            &service_context,
            &service_provider,
            &user_id,
            UpdateEncounter {
                r#type: input.r#type,
                data: input.data,
                schema_id: input.schema_id,
                parent: input.parent,
            },
            allowed_ctx.clone(),
        ) {
            Ok(document) => document,
            Err(error) => {
                let formatted_error = format!("{error:#?}");
                let std_err = match error {
                    UpdateEncounterError::NotAllowedToMutateDocument => {
                        StandardGraphqlError::Forbidden(formatted_error)
                    }
                    UpdateEncounterError::InvalidParentId => {
                        StandardGraphqlError::BadUserInput(formatted_error)
                    }
                    UpdateEncounterError::InvalidClinicianId => {
                        StandardGraphqlError::BadUserInput(formatted_error)
                    }
                    UpdateEncounterError::EncounterRowNotFound => {
                        StandardGraphqlError::BadUserInput(formatted_error)
                    }
                    UpdateEncounterError::InvalidDataSchema(_) => {
                        StandardGraphqlError::BadUserInput(formatted_error)
                    }
                    UpdateEncounterError::DataSchemaDoesNotExist => {
                        StandardGraphqlError::BadUserInput(formatted_error)
                    }
                    UpdateEncounterError::InternalError(_) => {
                        StandardGraphqlError::InternalError(formatted_error)
                    }
                    UpdateEncounterError::DatabaseError(_) => {
                        StandardGraphqlError::InternalError(formatted_error)
                    }
                };
                return Err(std_err.extend());
            }
        };

        let encounter = service_provider
            .encounter_service
            .encounter(
                &service_context,
                EncounterFilter::new()
                    .document_name(EqualFilter::equal_to(document.name.to_owned())),
                allowed_ctx.clone(),
            )
            .map_err(StandardGraphqlError::from_repository_error)?
            .ok_or(
                StandardGraphqlError::InternalError("Encounter went missing".to_string())
                    .extend(),
            )?;
        Ok(encounter)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(UpdateEncounterResponse::Response(EncounterNode {
        store_id: store_id_for_response,
        encounter,
        allowed_ctx: allowed_ctx_for_response,
    }))
}
