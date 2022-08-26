use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::program::{UpsertProgramEnrolment, UpsertProgramEnrolmentError},
};

use crate::types::document::DocumentNode;

#[derive(InputObject)]
pub struct InsertProgramEnrolmentInput {
    /// The program type
    pub r#type: String,
    pub patient_id: String,
    /// Program document data
    pub data: serde_json::Value,
    /// The schema id used for the program data
    pub schema_id: String,
}

#[derive(Union)]
pub enum InsertProgramEnrolmentResponse {
    Response(DocumentNode),
}

pub fn insert_program_enrolment(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertProgramEnrolmentInput,
) -> Result<InsertProgramEnrolmentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProgram,
            store_id: Some(store_id),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    match service_provider
        .program_enrolment_service
        .upsert_program_enrolment(
            &service_context,
            service_provider,
            &user.user_id,
            UpsertProgramEnrolment {
                data: input.data,
                schema_id: input.schema_id,
                parent: None,
                patient_id: input.patient_id,
                r#type: input.r#type,
            },
        ) {
        Ok(document) => Ok(InsertProgramEnrolmentResponse::Response(DocumentNode {
            document,
        })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                UpsertProgramEnrolmentError::InvalidPatientId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramEnrolmentError::InvalidParentId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramEnrolmentError::ProgramExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramEnrolmentError::InvalidDataSchema(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramEnrolmentError::DataSchemaDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramEnrolmentError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpsertProgramEnrolmentError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
