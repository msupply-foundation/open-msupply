use async_graphql::*;
use graphql_core::{
    ContextExt,
    simple_generic_errors::{DatabaseError, InternalError, UniqueValueKey, UniqueValueViolation},
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::{CampaignKindNode, CampaignNode};
use repository::campaign::campaign::Campaign;
use service::{
    auth::{Resource, ResourceAccessRequest},
    campaign::{UpsertCampaign, UpsertCampaignError as ServiceError},
};

#[derive(InputObject)]
pub struct UpsertCampaignInput {
    pub id: String,
    pub name: String,
    /// Omit to leave the stored code alone; blank clears it
    pub code: Option<String>,
    pub kind: Option<CampaignKindNode>,
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
    // A duplicate name or code; `field` says which
    UniqueValueViolation(UniqueValueViolation),
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
            require_central_standalone: false,
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
            code: self.code,
            kind: self.kind.map(Into::into),
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
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Structured errors
        ServiceError::DuplicateName => {
            return Ok(UpsertCampaignErrorInterface::UniqueValueViolation(
                UniqueValueViolation(UniqueValueKey::Name),
            ));
        }
        ServiceError::DuplicateCode => {
            return Ok(UpsertCampaignErrorInterface::UniqueValueViolation(
                UniqueValueViolation(UniqueValueKey::Code),
            ));
        }
        // Generic errors
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_repository_error) => InternalError(formatted_error),
        ServiceError::CampaignDoesNotExist => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
