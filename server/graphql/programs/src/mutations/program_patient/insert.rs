use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::patient::PatientNode;
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

pub fn insert_program_patient(
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
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let service_context =
        service_provider.context(store_id.to_string(), user.user_id.to_string())?;

    match service_provider.patient_service.upsert_program_patient(
        &service_context,
        service_provider,
        &store_id,
        &user.user_id,
        UpdateProgramPatient {
            data: input.data,
            schema_id: input.schema_id,
            parent: None,
        },
    ) {
        Ok(patient) => Ok(InsertProgramPatientResponse::Response(PatientNode {
            store_id,
            patient,
            allowed_ctx: allowed_ctx.clone(),
        })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
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
