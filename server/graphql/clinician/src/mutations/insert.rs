use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::patient::GenderTypeNode;
use graphql_types::types::IdResponse;
use repository::GenderType;
use service::{
    auth::{Resource, ResourceAccessRequest},
    clinician::{InsertClinician, InsertClinicianError},
};

#[derive(InputObject)]
pub struct InsertClinicianInput {
    pub id: String,
    pub code: String,
    pub initials: String,
    pub last_name: String,
    pub first_name: Option<String>,
    pub gender: Option<GenderTypeNode>,
    pub mobile: Option<String>,
}

pub fn insert_clinician(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertClinicianInput,
) -> Result<IdResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateClinician,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .clinician_service
        .insert_clinician(&service_context, input.to_domain());

    match result {
        Ok(clinician) => Ok(IdResponse(clinician.id)),
        Err(error) => map_error(error),
    }
}

impl InsertClinicianInput {
    pub fn to_domain(self) -> InsertClinician {
        let InsertClinicianInput {
            id,
            code,
            initials,
            last_name,
            first_name,
            gender,
            mobile,
        } = self;

        InsertClinician {
            id,
            code,
            initials,
            last_name,
            first_name,
            gender: gender.map(|g| GenderType::from(g)),
            mobile,
        }
    }
}

fn map_error(error: InsertClinicianError) -> Result<IdResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);
    log::error!("Error inserting clinician: {}", formatted_error);

    let graphql_error = match error {
        InsertClinicianError::ClinicianAlreadyExists
        | InsertClinicianError::InitialsCannotBeEmpty
        | InsertClinicianError::LastNameCannotBeEmpty
        | InsertClinicianError::InvalidStore
        | InsertClinicianError::CodeCannotBeEmpty => BadUserInput(formatted_error),

        InsertClinicianError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
