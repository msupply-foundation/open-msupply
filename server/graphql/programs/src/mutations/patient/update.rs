use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_general::GenderInput;
use graphql_types::types::patient::PatientNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::{UpdateNamePatient, UpdateNamePatientError},
};
use util::inline_init;

/// All fields in the input object will be used to update the patient record.
/// This means that the caller also has to provide the fields that are not going to change.
/// For example, if the last_name is not provided the last_name in the patient record will be clear.
#[derive(InputObject)]
pub struct UpdatePatientInput {
    pub id: String,
    pub code: String,
    pub code_2: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<GenderInput>,
    pub date_of_birth: Option<NaiveDate>,
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

    match service_provider.patient_service.update_name_patient(
        &service_context,
        service_provider,
        inline_init(|n: &mut UpdateNamePatient| {
            n.id = id;
            n.code = code;
            n.code_2 = code_2;
            n.first_name = first_name;
            n.last_name = last_name;
            n.gender = gender.map(|g| g.to_domain());
            n.date_of_birth = date_of_birth;
        }),
    ) {
        Ok(patient) => Ok(UpdatePatientResponse::Response(PatientNode {
            store_id,
            patient,
            allowed_ctx: allowed_ctx.clone(),
        })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                UpdateNamePatientError::PatientDoesNotExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                UpdateNamePatientError::NotAPatient => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdateNamePatientError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdateNamePatientError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
