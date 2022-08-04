use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::patient::{UpdatePatient, UpdatePatientError},
};

use crate::queries::PatientNode;

#[derive(InputObject)]
pub struct InsertPatientInput {
    /// Patient document data
    pub data: serde_json::Value,
    /// The schema id used for the patient data
    pub schema_id: String,
}

#[derive(Union)]
pub enum InsertPatientResponse {
    Response(PatientNode),
}

pub fn insert_patient(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertPatientInput,
) -> Result<InsertPatientResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePatient,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    match service_provider.patient_service.update_patient(
        &service_context,
        service_provider,
        &store_id,
        &user.user_id,
        UpdatePatient {
            data: input.data,
            schema_id: input.schema_id,
            parent: None,
        },
    ) {
        Ok(patient) => Ok(InsertPatientResponse::Response(PatientNode {
            store_id,
            patient,
        })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                UpdatePatientError::InvalidDataSchema(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdatePatientError::DataSchemaDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdatePatientError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdatePatientError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdatePatientError::InvalidPatientId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdatePatientError::PatientExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdatePatientError::InvalidParentId => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
