use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError, UniqueValueKey, UniqueValueViolation},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::CampaignNode;
use repository::campaign::campaign::Campaign;
use service::{
    auth::{Resource, ResourceAccessRequest},
    campaign::{UpsertCampaign, UpsertCampaignError as ServiceError},
};

#[derive(InputObject)]
pub struct UpsertCampaignInput {
    pub id: String,
    pub name: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

#[derive(SimpleObject)]
pub struct UpsertCampaignError {
    pub error: UpsertCampaignErrorInterface,
}

#[derive(Union)]
pub enum UpsertCampaignResponse {
    Error(UpsertCampaignError),
    Response(CampaignNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpsertCampaignErrorInterface {
    DuplicateName(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

pub fn upsert_campaign(
    ctx: &Context<'_>,
    input: UpsertCampaignInput,
) -> Result<UpsertCampaignResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateCampaigns,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .campaign_service
        .upsert_campaign(&service_context, input.to_domain());

    map_response(result)
}

impl UpsertCampaignInput {
    pub fn to_domain(self) -> UpsertCampaign {
        UpsertCampaign {
            id: self.id,
            name: self.name,
            start_date: self.start_date,
            end_date: self.end_date,
        }
    }
}

fn map_response(from: Result<Campaign, ServiceError>) -> Result<UpsertCampaignResponse> {
    let result = match from {
        Ok(campaign) => UpsertCampaignResponse::Response(CampaignNode::from_domain(campaign)),
        Err(error) => UpsertCampaignResponse::Error(UpsertCampaignError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpsertCampaignErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured errors
        ServiceError::DuplicateName => {
            return Ok(UpsertCampaignErrorInterface::DuplicateName(
                UniqueValueViolation(UniqueValueKey::Name),
            ))
        }
        // Generic errors
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_repository_error) => InternalError(formatted_error),
        ServiceError::CampaignDoesNotExist | ServiceError::InvalidDates => {
            BadUserInput(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
