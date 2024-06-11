use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{patient::PatientNode, GenderInput};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::{UpdatePatient, UpdatePatientError},
};
use util::inline_init;

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
    pub gender: Option<GenderInput>,
    pub date_of_birth: Option<NaiveDate>,
    pub address1: Option<String>,
    pub phone: Option<String>,
    pub is_deceased: Option<bool>,
    pub date_of_death: Option<NaiveDate>,
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

    let update_patient = inline_init(|n: &mut UpdatePatient| {
        n.id = id;
        n.code = code;
        n.code_2 = code_2;
        n.first_name = first_name;
        n.last_name = last_name;
        n.gender = gender.map(|g| g.to_domain());
        n.date_of_birth = date_of_birth;
        n.address1 = address1;
        n.phone = phone;
        n.is_deceased = is_deceased;
        n.date_of_death = date_of_death;
    });

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
