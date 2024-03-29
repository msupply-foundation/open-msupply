use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::encounter::EncounterNode;
use repository::{EncounterFilter, EqualFilter};
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

pub fn update_encounter(
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
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let document = match service_provider.encounter_service.update_encounter(
        &service_context,
        service_provider,
        &user.user_id,
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
            let formatted_error = format!("{:#?}", error);
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
            EncounterFilter::new().document_name(EqualFilter::equal_to(&document.name)),
            allowed_ctx.clone(),
        )?
        .ok_or(
            StandardGraphqlError::InternalError("Encounter went missing".to_string()).extend(),
        )?;

    Ok(UpdateEncounterResponse::Response(EncounterNode {
        store_id,
        encounter,
        allowed_ctx: allowed_ctx.clone(),
    }))
}
