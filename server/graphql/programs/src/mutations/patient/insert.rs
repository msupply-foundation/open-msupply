use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::patient::{GenderTypeNode, PatientNode};
use repository::{GenderType, NameRowType, Patient, RepositoryError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::{InsertPatient as ServiceInput, InsertPatientError},
};

#[derive(InputObject)]
pub struct InsertPatientInput {
    pub id: String,
    pub code: String,
    pub code_2: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<GenderTypeNode>,
    pub date_of_birth: Option<NaiveDate>,
    pub address1: Option<String>,
    pub phone: Option<String>,
    pub is_deceased: Option<bool>,
    pub date_of_death: Option<NaiveDate>,
    pub next_of_kin_id: Option<String>,
    pub next_of_kin_name: Option<String>,
}

#[derive(Union)]
pub enum InsertPatientResponse {
    Response(PatientNode),
}

pub async fn insert_patient(
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
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();
    let store_id_for_response = store_id.clone();
    let allowed_ctx_for_response = allowed_ctx.clone();
    let user_id = user.user_id.clone();
    let domain_input = input.to_domain();

    let result = tokio::task::spawn_blocking(
        move || -> Result<Result<Patient, InsertPatientError>, RepositoryError> {
            let service_context = service_provider.context(store_id.to_string(), user_id)?;
            Ok(service_provider.patient_service.insert_patient(
                &service_context,
                &service_provider,
                &store_id,
                domain_input,
            ))
        },
    )
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    match result {
        Ok(patient) => Ok(InsertPatientResponse::Response(PatientNode {
            store_id: store_id_for_response,
            patient,
            allowed_ctx: allowed_ctx_for_response,
        })),
        Err(error) => {
            let formatted_error = format!("{error:#?}");
            let std_err = match error {
                InsertPatientError::PatientExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InsertPatientError::NotAPatient => {
                    StandardGraphqlError::InternalError(formatted_error)
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

impl InsertPatientInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertPatientInput {
            id,
            code,
            code_2,
            first_name,
            last_name,
            gender,
            date_of_birth,
            address1,
            phone,
            date_of_death,
            is_deceased,
            next_of_kin_id,
            next_of_kin_name,
        } = self;

        ServiceInput {
            id,
            code,
            code_2,
            first_name,
            last_name,
            gender: gender.map(GenderType::from),
            date_of_birth,
            address1,
            phone,
            date_of_death,
            is_deceased,
            next_of_kin_id,
            next_of_kin_name,
            r#type: NameRowType::Patient,
        }
    }
}
