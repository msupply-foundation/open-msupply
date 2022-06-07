use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::patient::{InsertPatient, InsertPatientError},
};

use crate::queries::PatientNode;

#[derive(InputObject)]
pub struct InsertPatientInput {
    /// Patient document data
    pub data: serde_json::Value,
    /// The schema id used for the patient data
    pub schema_id: Option<String>,
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
            resource: Resource::MutateLocation,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    match service_provider.patient_service.insert_patients(
        &service_context,
        service_provider,
        store_id,
        &user.user_id,
        InsertPatient {
            data: input.data,
            schema_id: input.schema_id,
        },
    ) {
        Ok(patient) => Ok(InsertPatientResponse::Response(PatientNode { patient })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                InsertPatientError::InvalidDataSchema(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertPatientError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                InsertPatientError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
