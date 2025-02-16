use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use repository::name_insurance_join_row::NameInsuranceJoinRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    insurance::update::{UpdateInsurance as ServiceInput, UpdateInsuranceError as ServiceError},
};

use super::insert_insurance::InsurancePolicyNodeType;

#[derive(InputObject)]
pub struct UpdateInsuranceInput {
    pub id: String,
    pub insurance_provider_id: Option<String>,
    pub policy_type: Option<InsurancePolicyNodeType>,
    pub discount_percentage: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub is_active: Option<bool>,
}

impl UpdateInsuranceInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInsuranceInput {
            id,
            insurance_provider_id,
            policy_type,
            discount_percentage,
            expiry_date,
            is_active,
        } = self;

        ServiceInput {
            id,
            insurance_provider_id,
            policy_type: policy_type.map(|t| t.to_domain()),
            discount_percentage,
            expiry_date,
            is_active,
        }
    }
}

pub struct UpdateInsuranceNode {
    pub id: String,
}

#[Object]
impl UpdateInsuranceNode {
    pub async fn id(&self) -> &str {
        &self.id
    }
}

#[derive(Union)]
pub enum UpdateInsuranceResponse {
    Response(UpdateInsuranceNode),
}

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
        Ok(insurance) => Ok(UpdateInsuranceResponse::Response(UpdateInsuranceNode {
            id: insurance.id,
        })),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<UpdateInsuranceResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::InsuranceDoesNotExist | ServiceError::UpdatedRecordNotFound => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
