use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{IdResponse, InsurancePolicyNodeType};
use repository::name_insurance_join_row::NameInsuranceJoinRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    insurance::insert::{InsertInsurance as ServiceInput, InsertInsuranceError as ServiceError},
};

#[derive(InputObject)]
pub struct InsertInsuranceInput {
    pub id: String,
    pub name_id: String,
    pub insurance_provider_id: String,
    pub policy_number_person: String,
    pub policy_number_family: String,
    pub policy_type: InsurancePolicyNodeType,
    pub discount_percentage: f64,
    pub expiry_date: chrono::NaiveDate,
    pub is_active: bool,
}

impl InsertInsuranceInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInsuranceInput {
            id,
            name_id,
            insurance_provider_id,
            policy_number_family,
            policy_number_person,
            policy_type,
            discount_percentage,
            expiry_date,
            is_active,
        } = self;

        ServiceInput {
            id,
            name_link_id: name_id,
            insurance_provider_id,
            policy_number_family,
            policy_number_person,
            policy_type: policy_type.to_domain(),
            discount_percentage,
            expiry_date,
            is_active,
        }
    }
}

#[derive(Union)]
#[graphql(name = "InsertInsuranceResponse")]
pub enum InsertInsuranceResponse {
    Response(IdResponse),
}

pub fn insert_insurance(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInsuranceInput,
) -> Result<InsertInsuranceResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePatient,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .insurance_service
            .insert_insurance(&service_context, input.to_domain()),
    )
}

pub fn map_response(
    from: Result<NameInsuranceJoinRow, ServiceError>,
) -> Result<InsertInsuranceResponse> {
    match from {
        Ok(insurance) => Ok(InsertInsuranceResponse::Response(IdResponse(insurance.id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<InsertInsuranceResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::InsuranceAlreadyExists | ServiceError::CreatedRecordNotFound => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
