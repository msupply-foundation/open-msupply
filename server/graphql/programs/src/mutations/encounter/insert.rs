use async_graphql::*;
use chrono::Utc;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::encounter::EncounterNode;
use repository::{EncounterFilter, EqualFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::encounter::{InsertEncounter, InsertEncounterError},
};

#[derive(InputObject)]
pub struct InsertEncounterInput {
    /// The encounter type
    pub r#type: String,
    pub patient_id: String,
    /// Encounter document data
    pub data: serde_json::Value,
    /// The schema id used for the encounter data
    pub schema_id: String,
}

#[derive(Union)]
pub enum InsertEncounterResponse {
    Response(EncounterNode),
}

pub fn insert_encounter(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertEncounterInput,
) -> Result<InsertEncounterResponse> {
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

    let document = match service_provider.encounter_service.insert_encounter(
        &service_context,
        service_provider,
        &user.user_id,
        InsertEncounter {
            data: input.data,
            schema_id: input.schema_id,
            patient_id: input.patient_id,
            r#type: input.r#type,
            event_datetime: Utc::now(),
        },
        allowed_ctx.clone(),
    ) {
        Ok(document) => document,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                InsertEncounterError::NotAllowedToMutateDocument => {
                    StandardGraphqlError::Forbidden(formatted_error)
                }
                InsertEncounterError::InvalidEncounterType => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertEncounterError::PatientIsNotEnrolled => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertEncounterError::InvalidClinicianId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertEncounterError::InvalidDataSchema(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertEncounterError::DataSchemaDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertEncounterError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                InsertEncounterError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(std_err.extend());
        }
    };

    let encounter_row = service_provider
        .encounter_service
        .encounter(
            &service_context,
            EncounterFilter::new().document_name(EqualFilter::equal_to(&document.name)),
            allowed_ctx.clone(),
        )?
        .ok_or(
            StandardGraphqlError::InternalError("Encounter went missing".to_string()).extend(),
        )?;

    Ok(InsertEncounterResponse::Response(EncounterNode {
        store_id,
        encounter: encounter_row,
        allowed_ctx: allowed_ctx.clone(),
    }))
}
