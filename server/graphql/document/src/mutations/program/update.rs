use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::program::{UpsertProgram, UpsertProgramError},
};

use crate::types::document::DocumentNode;

#[derive(InputObject)]
pub struct UpdateProgramInput {
    /// The program type
    pub r#type: String,
    pub patient_id: String,
    /// Program document data
    pub data: serde_json::Value,
    /// The schema id used for the program data
    pub schema_id: String,
    pub parent: String,
}

#[derive(Union)]
pub enum UpdateProgramResponse {
    Response(DocumentNode),
}

pub fn update_program(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdateProgramInput,
) -> Result<UpdateProgramResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProgram,
            store_id: Some(store_id),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    match service_provider.program_service.upsert_program(
        &service_context,
        service_provider,
        &user.user_id,
        UpsertProgram {
            data: input.data,
            schema_id: input.schema_id,
            parent: Some(input.parent),
            patient_id: input.patient_id,
            r#type: input.r#type,
        },
    ) {
        Ok((_, document)) => Ok(UpdateProgramResponse::Response(DocumentNode { document })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                UpsertProgramError::InvalidPatientId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramError::InvalidParentId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramError::ProgramExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramError::InvalidDataSchema(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramError::DataSchemaDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpsertProgramError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
