use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::encounter::{InsertEncounter, InsertEncounterError},
};

use crate::types::document::DocumentNode;

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
    Response(DocumentNode),
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
    let service_context = service_provider.context()?;

    match service_provider.encounter_service.insert_encounter(
        &service_context,
        service_provider,
        store_id.clone(),
        &user.user_id,
        InsertEncounter {
            data: input.data,
            schema_id: input.schema_id,
            patient_id: input.patient_id,
            program_type: input.program_type,
            r#type: input.r#type,
        },
    ) {
        Ok(document) => Ok(InsertEncounterResponse::Response(DocumentNode { document })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                InsertEncounterError::InvalidPatientOrProgram => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertEncounterError::InvalidDataSchema(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertEncounterError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                InsertEncounterError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
