use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_general::GenderInput;
use graphql_types::types::patient::PatientNode;
use repository::{NameRow, NameType};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::{patient_updated::patient_name, InsertNamePatientError},
};
use util::inline_init;

#[derive(InputObject)]
pub struct InsertPatientInput {
    pub id: String,
    pub code: String,
    pub code_2: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<GenderInput>,
    pub date_of_birth: Option<NaiveDate>,
}

#[derive(Union)]
pub enum InsertPatientResponse {
    Response(PatientNode),
}

pub fn insert_patient(
    ctx: &Context<'_>,
    store_id: String,
    InsertPatientInput {
        id,
        code,
        code_2,
        first_name,
        last_name,
        gender,
        date_of_birth,
    }: InsertPatientInput,
) -> Result<InsertPatientResponse> {
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

    match service_provider.patient_service.insert_name_patient(
        &service_context,
        service_provider,
        inline_init(|n: &mut NameRow| {
            n.id = id;
            n.r#type = NameType::Patient;
            n.name = patient_name(&first_name, &last_name);
            n.code = code;
            n.national_health_number = code_2;
            n.first_name = first_name;
            n.last_name = last_name;
            n.gender = gender.map(|g| g.to_domain());
            n.date_of_birth = date_of_birth;
        }),
    ) {
        Ok(patient) => Ok(InsertPatientResponse::Response(PatientNode {
            store_id,
            patient,
            allowed_ctx: allowed_ctx.clone(),
        })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let std_err = match error {
                InsertNamePatientError::PatientExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertNamePatientError::NotAPatient => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                InsertNamePatientError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                InsertNamePatientError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(std_err.extend())
        }
    }
}
