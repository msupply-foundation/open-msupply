use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::program_enrolment::ProgramEnrolmentNode;
use repository::{EqualFilter, ProgramEnrolment, ProgramEnrolmentFilter};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::program_enrolment::{UpsertProgramEnrolment, UpsertProgramEnrolmentError},
};

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
    Response(ProgramEnrolmentNode),
}

pub async fn insert_program_enrolment(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertProgramEnrolmentInput,
) -> Result<InsertProgramEnrolmentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();
    let store_id_for_response = store_id.clone();
    let allowed_ctx_for_response = allowed_ctx.clone();
    let user_id = user.user_id.clone();

    let program_row = tokio::task::spawn_blocking(move || -> async_graphql::Result<ProgramEnrolment> {
        let service_context = service_provider
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;

        let patient_id_clone = input.patient_id.clone();

        let document = match service_provider
            .program_enrolment_service
            .upsert_program_enrolment(
                &service_context,
                &service_provider,
                &user_id,
                UpsertProgramEnrolment {
                    data: input.data,
                    schema_id: input.schema_id,
                    parent: None,
                    patient_id: input.patient_id.clone(),
                    r#type: input.r#type,
                },
                allowed_ctx.clone(),
            ) {
            Ok(document) => document,
            Err(error) => {
                let formatted_error = format!("{error:#?}");
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
                    .patient_id(EqualFilter::equal_to(patient_id_clone))
                    .context_id(EqualFilter::equal_to(document.context_id.to_string())),
                allowed_ctx.clone(),
            )
            .map_err(StandardGraphqlError::from_repository_error)?
            .ok_or(
                StandardGraphqlError::InternalError(
                    "Program enrolment went missing".to_string(),
                )
                .extend(),
            )?;
        Ok(program_row)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(InsertProgramEnrolmentResponse::Response(
        ProgramEnrolmentNode {
            store_id: store_id_for_response,
            program_enrolment: program_row,
            allowed_ctx: allowed_ctx_for_response,
        },
    ))
}
