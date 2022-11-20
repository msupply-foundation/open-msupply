use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{CapabilityTag, Resource, ResourceAccessRequest},
    programs::patient::{UpdatePatient, UpdatePatientError},
};

use crate::queries::PatientNode;

#[derive(InputObject)]
pub struct UpdatePatientInput {
    /// Patient document data
    pub data: serde_json::Value,
    /// The schema id used for the patient data
    pub schema_id: String,
    pub parent: String,
}

#[derive(Union)]
pub enum UpdatePatientResponse {
    Response(PatientNode),
}

pub fn update_patient(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdatePatientInput,
) -> Result<UpdatePatientResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePatient,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_docs = user.capabilities(CapabilityTag::DocumentType);

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    match service_provider.patient_service.update_patient(
        &service_context,
        service_provider,
        &store_id,
        &user.user_id,
        UpdatePatient {
            data: input.data,
            schema_id: input.schema_id,
            parent: Some(input.parent),
        },
    ) {
        Ok(patient) => Ok(UpdatePatientResponse::Response(PatientNode {
            store_id,
            patient,
            allowed_docs: allowed_docs.clone(),
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
                UpdatePatientError::PatientDoesNotBelongToStore => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
