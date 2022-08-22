use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::encounter::{UpdateEncounter, UpdateEncounterError},
};

use crate::types::document::DocumentNode;

#[derive(InputObject)]
pub struct UpdateEncounterInput {
    /// Encounter document data
    pub data: serde_json::Value,
    /// The schema id used for the counter data
    pub schema_id: String,
    /// The document id of the encounter document which should be updated
    pub parent: String,
}

#[derive(Union)]
pub enum UpdateEncounterResponse {
    Response(DocumentNode),
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
            store_id: Some(store_id),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    match service_provider.encounter_service.update_encounter(
        &service_context,
        service_provider,
        &user.user_id,
        UpdateEncounter {
            data: input.data,
            schema_id: input.schema_id,
            parent: input.parent,
        },
    ) {
        Ok(document) => Ok(UpdateEncounterResponse::Response(DocumentNode { document })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                UpdateEncounterError::InvalidParentId => {
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
            Err(std_err.extend())
        }
    }
}
