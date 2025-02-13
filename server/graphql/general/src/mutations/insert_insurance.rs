use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::name_insurance_join_row::{InsurancePolicyType, NameInsuranceJoinRow};
use serde::Serialize;
use service::{
    auth::{Resource, ResourceAccessRequest},
    insurance::insert::{InsertInsurance as ServiceInput, InsertInsuranceError as ServiceError},
};

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
        Ok(insurance) => Ok(InsertInsuranceResponse::Response(InsuranceNode {
            id: insurance.id,
        })),
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

pub struct InsuranceNode {
    pub id: String,
}

#[Object]
impl InsuranceNode {
    pub async fn id(&self) -> &str {
        &self.id
    }
}

#[derive(Union)]
#[graphql(name = "InsertInsuranceResponse")]
pub enum InsertInsuranceResponse {
    Response(InsuranceNode),
}

#[derive(InputObject)]
pub struct InsertInsuranceInput {
    pub id: String,
    pub name_link_id: String,
    pub insurance_provider_id: String,
    pub policy_number_person: Option<String>,
    pub policy_number: String,
    pub policy_type: InsurancePolicyNodeType,
    pub discount_percentage: f64,
    pub expiry_date: chrono::NaiveDate,
    pub is_active: bool,
    pub provider_name: String,
}

impl InsertInsuranceInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInsuranceInput {
            id,
            name_link_id,
            insurance_provider_id,
            policy_number_person,
            policy_number,
            policy_type,
            discount_percentage,
            expiry_date,
            is_active,
            provider_name,
        } = self;

        ServiceInput {
            id,
            name_link_id,
            insurance_provider_id,
            policy_number_person,
            policy_number,
            policy_type: policy_type.to_domain(),
            discount_percentage,
            expiry_date,
            is_active,
            provider_name,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InsurancePolicyNodeType {
    Personal,
    Business,
}

impl InsurancePolicyNodeType {
    pub fn to_domain(&self) -> InsurancePolicyType {
        match self {
            InsurancePolicyNodeType::Personal => InsurancePolicyType::Personal,
            InsurancePolicyNodeType::Business => InsurancePolicyType::Business,
        }
    }
}
