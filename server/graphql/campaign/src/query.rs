use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    CampaignConnector, CampaignFilterInput, CampaignResponse, CampaignsResponse, NodeError,
    CampaignNode, CampaignSortInput
};
use repository::{
    campaign::campaign::{CampaignFilter, CampaignSort},
    EqualFilter, PaginationOption
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    campaign::get_campaigns as service_get_campaigns,
};

pub async fn get_campaigns(
    ctx: &Context<'_>,
    page: Option<i32>,
    page_size: Option<i32>,
    filter: Option<CampaignFilterInput>,
    sort: Option<Vec<CampaignSortInput>>,
) -> Result<CampaignsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryCampaigns,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let pagination = PaginationOption {
        limit: page_size.map(|p| p as u32),
        offset: page.map(|p| (p - 1) * page_size.unwrap_or(20) as u32),
    };

    let sort = sort
        .map(|mut sort_list| sort_list.pop()) // Only take the first sort option for now
        .flatten()
        .map(|sort| sort.to_domain());

    let service_context = service_provider.basic_context()?;

    let result = service_get_campaigns(
        &service_context,
        Some(pagination),
        filter.map(CampaignFilter::from),
        sort,
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(CampaignsResponse::Response(CampaignConnector::from_domain(
        result,
    )))
}

pub async fn get_campaign(ctx: &Context<'_>, id: String) -> Result<CampaignResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryCampaigns,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .campaign_service
        .get_campaigns(
            &service_context,
            None,
            Some(CampaignFilter::new().id(EqualFilter::equal_to(&id))),
            None,
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    let campaign = match result.rows.first() {
        Some(campaign) => campaign,
        None => {
            return Ok(CampaignResponse::Error(NodeError {
                error: "Campaign not found".to_string(),
            }))
        }
    };

    Ok(CampaignResponse::Response(CampaignNode::from_domain(
        campaign.clone(),
    )))
}
