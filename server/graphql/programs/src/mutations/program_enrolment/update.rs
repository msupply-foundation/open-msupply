use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::program_enrolment::ProgramEnrolmentNode;
use repository::{EqualFilter, ProgramEnrolmentFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::program_enrolment::{UpsertProgramEnrolment, UpsertProgramEnrolmentError},
};

#[derive(InputObject)]
pub struct UpdateProgramEnrolmentInput {
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
pub enum UpdateProgramEnrolmentResponse {
    Response(ProgramEnrolmentNode),
}

pub fn update_program_enrolment(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdateProgramEnrolmentInput,
) -> Result<UpdateProgramEnrolmentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let document = match service_provider
        .program_enrolment_service
        .upsert_program_enrolment(
            &service_context,
            service_provider,
            &user.user_id,
            UpsertProgramEnrolment {
                data: input.data,
                schema_id: input.schema_id,
                parent: Some(input.parent),
                patient_id: input.patient_id.clone(),
                r#type: input.r#type,
            },
            allowed_ctx.clone(),
        ) {
        Ok(document) => document,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                UpsertProgramEnrolmentError::NotAllowedToMutateDocument => {
                    StandardGraphqlError::Forbidden(formatted_error)
                }
                UpsertProgramEnrolmentError::InvalidPatientId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramEnrolmentError::InvalidParentId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramEnrolmentError::ProgramEnrolmentExists => {
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
                UpsertProgramEnrolmentError::DocumentTypeDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpsertProgramEnrolmentError::ProgramDoesNotExist => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            return Err(std_err.extend());
        }
    };

    let program_row = service_provider
        .program_enrolment_service
        .program_enrolment(
            &service_context,
            ProgramEnrolmentFilter::new()
                .patient_id(EqualFilter::equal_to(input.patient_id.to_string()))
                .context_id(EqualFilter::equal_to(document.context_id.to_string())),
            allowed_ctx.clone(),
        )?
        .ok_or(
            StandardGraphqlError::InternalError("Program enrolment went missing".to_string())
                .extend(),
        )?;
    Ok(UpdateProgramEnrolmentResponse::Response(
        ProgramEnrolmentNode {
            store_id,
            program_enrolment: program_row,
            allowed_ctx: allowed_ctx.clone(),
        },
    ))
}
