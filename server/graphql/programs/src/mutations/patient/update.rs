use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::patient::{GenderType, PatientNode};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::{UpdatePatient, UpdatePatientError},
};

/// All fields in the input object will be used to update the patient record.
/// This means that the caller also has to provide the fields that are not going to change.
/// For example, if the last_name is not provided, the last_name in the patient record will be cleared.
#[derive(InputObject)]
pub struct UpdatePatientInput {
    pub id: String,
    pub code: String,
    pub code_2: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<GenderType>,
    pub date_of_birth: Option<NaiveDate>,
    pub address1: Option<String>,
    pub phone: Option<String>,
    pub is_deceased: Option<bool>,
    pub date_of_death: Option<NaiveDate>,
    pub next_of_kin_id: Option<String>,
    pub next_of_kin_name: Option<String>,
}

#[derive(Union)]
pub enum UpdatePatientResponse {
    Response(PatientNode),
}

pub fn update_patient(
    ctx: &Context<'_>,
    store_id: String,
    UpdatePatientInput {
        id,
        code,
        code_2,
        first_name,
        last_name,
        gender,
        date_of_birth,
        address1,
        phone,
        is_deceased,
        date_of_death,
        next_of_kin_id,
        next_of_kin_name,
    }: UpdatePatientInput,
) -> Result<UpdatePatientResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePatient,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let update_patient = UpdatePatient {
        id,
        code,
        code_2,
        first_name,
        last_name,
        gender: gender.map(|g| g.to_domain()),
        date_of_birth,
        address1,
        phone,
        is_deceased,
        date_of_death,
        next_of_kin_id,
        next_of_kin_name,
    };

    match service_provider.patient_service.update_patient(
        &service_context,
        service_provider,
        update_patient,
    ) {
        Ok(patient) => Ok(UpdatePatientResponse::Response(PatientNode {
            store_id,
            patient,
            allowed_ctx: allowed_ctx.clone(),
        })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                UpdatePatientError::PatientDoesNotExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdatePatientError::NotAPatient => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdatePatientError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdatePatientError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
