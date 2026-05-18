use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::patient::PatientNode;
use repository::{Patient, RepositoryError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::{UpdateProgramPatient, UpdateProgramPatientError},
};

#[derive(InputObject)]
pub struct InsertProgramPatientInput {
    /// Patient document data
    pub data: serde_json::Value,
    /// The schema id used for the patient data
    pub schema_id: String,
}

#[derive(Union)]
pub enum InsertProgramPatientResponse {
    Response(PatientNode),
}

pub async fn insert_program_patient(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertProgramPatientInput,
) -> Result<InsertProgramPatientResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePatient,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities().clone();
    let user_id = user.user_id.clone();

    let service_provider = ctx.service_provider_data();
    let store_id_for_response = store_id.clone();
    let allowed_ctx_for_response = allowed_ctx.clone();

    let result = tokio::task::spawn_blocking(
        move || -> Result<Result<Patient, UpdateProgramPatientError>, RepositoryError> {
            let service_context = service_provider.context(store_id.clone(), user_id.clone())?;
            Ok(service_provider.patient_service.upsert_program_patient(
                &service_context,
                &service_provider,
                &store_id,
                &user_id,
                UpdateProgramPatient {
                    data: input.data,
                    schema_id: input.schema_id,
                    parent: None,
                },
            ))
        },
    )
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    match result {
        Ok(patient) => Ok(InsertProgramPatientResponse::Response(PatientNode {
            store_id: store_id_for_response,
            patient,
            allowed_ctx: allowed_ctx_for_response,
        })),
        Err(error) => {
            let formatted_error = format!("{error:#?}");
            let std_err = match error {
                UpdateProgramPatientError::InvalidDataSchema(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateProgramPatientError::DataSchemaDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateProgramPatientError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdateProgramPatientError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdateProgramPatientError::InvalidPatientId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateProgramPatientError::PatientExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateProgramPatientError::InvalidParentId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateProgramPatientError::PatientDocumentRegistryDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
