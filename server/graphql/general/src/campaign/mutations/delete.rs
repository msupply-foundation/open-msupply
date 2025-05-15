use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    campaign::{DeleteCampaign, DeleteCampaignError as ServiceError},
};

#[derive(InputObject)]
pub struct DeleteCampaignInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteCampaignErrorInterface {
    DatabaseError(DatabaseError),
    CampaignNotFound(RecordNotFound),
}

#[derive(SimpleObject)]
pub struct DeleteCampaignError {
    pub error: DeleteCampaignErrorInterface,
}

#[derive(SimpleObject)]
pub struct DeleteCampaignSuccess {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteCampaignResponse {
    Error(DeleteCampaignError),
    Response(DeleteCampaignSuccess),
}

pub fn delete_campaign(
    ctx: &Context<'_>,
    input: DeleteCampaignInput,
) -> Result<DeleteCampaignResponse> {
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
        .delete_campaign(&service_context, DeleteCampaign { id: input.id });

    map_response(result)
}

fn map_response(result: Result<String, ServiceError>) -> Result<DeleteCampaignResponse> {
    let result = match result {
        Ok(id) => DeleteCampaignResponse::Response(DeleteCampaignSuccess { id }),
        Err(error) => DeleteCampaignResponse::Error(DeleteCampaignError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<DeleteCampaignErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::CampaignDoesNotExist => {
            return Ok(DeleteCampaignErrorInterface::CampaignNotFound(
                RecordNotFound,
            ))
        }
        ServiceError::DatabaseError(_) => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
