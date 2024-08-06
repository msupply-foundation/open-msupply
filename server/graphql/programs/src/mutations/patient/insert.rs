use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::patient::{GenderType, PatientNode};
use repository::NameType;
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
    pub gender: Option<GenderType>,
    pub date_of_birth: Option<NaiveDate>,
    pub address1: Option<String>,
    pub phone: Option<String>,
    pub is_deceased: Option<bool>,
    pub date_of_death: Option<NaiveDate>,
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
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    match service_provider.patient_service.insert_patient(
        &service_context,
        service_provider,
        &store_id,
        input.to_domain(),
    ) {
        Ok(patient) => Ok(InsertPatientResponse::Response(PatientNode {
            store_id,
            patient,
            allowed_ctx: allowed_ctx.clone(),
        })),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
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
        } = self;

        ServiceInput {
            id,
            code,
            code_2,
            first_name,
            last_name,
            gender: gender.map(|g| g.to_domain()),
            date_of_birth,
            address1,
            phone,
            date_of_death,
            is_deceased,
            r#type: NameType::Patient,
        }
    }
}
