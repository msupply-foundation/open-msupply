use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use repository::name_insurance_join_row::InsurancePolicyType;
use repository::name_insurance_join_row::NameInsuranceJoinRow;
use serde::Serialize;
use service::{
    auth::{Resource, ResourceAccessRequest},
    insurance::update::{UpdateInsurance as ServiceInput, UpdateInsuranceError as ServiceError},
};

pub fn update_insurance(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateInsuranceInput,
) -> Result<UpdateInsuranceResponse> {
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
            .update_insurance(&service_context, input.to_domain()),
    )
}

pub fn map_response(
    from: Result<NameInsuranceJoinRow, ServiceError>,
) -> Result<UpdateInsuranceResponse> {
    match from {
        Ok(insurance) => Ok(UpdateInsuranceResponse::Response(InsuranceNode {
            id: insurance.id,
        })),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateInsuranceResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graph_error = match error {
        ServiceError::InsuranceDoesNotExist | ServiceError::UpdatedRecordNotFound => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graph_error.extend())
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
pub enum UpdateInsuranceResponse {
    Response(InsuranceNode),
}

#[derive(InputObject)]
pub struct UpdateInsuranceInput {
    pub id: String,
    pub policy_number: Option<String>,
    pub policy_type: Option<InsurancePolicyNodeType>,
    pub discount_percentage: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: Option<bool>,
    pub provider_name: Option<String>,
}

impl UpdateInsuranceInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInsuranceInput {
            id,
            policy_number,
            policy_type,
            discount_percentage,
            expiry_date,
            is_active,
            provider_name,
        } = self;

        ServiceInput {
            id,
            policy_number,
            policy_type: policy_type.map(|t| t.to_domain()),
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
