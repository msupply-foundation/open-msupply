use async_graphql::*;
use chrono::Utc;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{EncounterFilter, EqualFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::encounter::{InsertEncounter, InsertEncounterError},
};

use crate::types::encounter::EncounterNode;

#[derive(InputObject)]
pub struct InsertEncounterInput {
    /// The encounter type
    pub r#type: String,
    pub patient_id: String,
    /// Encounter document data
    pub data: serde_json::Value,
    /// The schema id used for the encounter data
    pub schema_id: String,
    /// The program type
    pub program_type: String,
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

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    match user.context.into_iter().find(|c| c == &input.r#type) {
        None => Err(StandardGraphqlError::BadUserInput(format!(
            "User does not have access to {}",
            input.r#type,
        ))),
        Some(_) => Ok(()),
    }?;

    let document = match service_provider.encounter_service.insert_encounter(
        &service_context,
        service_provider,
        &user.user_id,
        InsertEncounter {
            data: input.data,
            schema_id: input.schema_id,
            patient_id: input.patient_id,
            program: input.program_type,
            r#type: input.r#type,
            event_datetime: Utc::now(),
        },
    ) {
        Ok(document) => document,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                InsertEncounterError::InvalidPatientOrProgram => {
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
            EncounterFilter::new().name(EqualFilter::equal_to(&document.name)),
        )?
        .ok_or(
            StandardGraphqlError::InternalError("Encounter went missing".to_string()).extend(),
        )?;

    Ok(InsertEncounterResponse::Response(EncounterNode {
        store_id,
        encounter_row,
    }))
}
