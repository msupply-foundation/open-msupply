use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    CampaignConnector, CampaignFilterInput, CampaignSortInput, CampaignsResponse,
};
use repository::{campaign::campaign::CampaignFilter, PaginationOption};
use service::{
    auth::{Resource, ResourceAccessRequest},
    campaign::get_campaigns as service_get_campaigns,
};

pub async fn get_campaigns(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<CampaignFilterInput>,
    sort: Option<Vec<CampaignSortInput>>,
    store_id: String,
) -> Result<CampaignsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryCampaigns,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let pagination = page.map(PaginationOption::from);

    let sort = sort
        .map(|mut sort_list| sort_list.pop()) // Only take the first sort option for now
        .flatten()
        .map(|sort| sort.to_domain());

    let service_context = service_provider.basic_context()?;

    let result = service_get_campaigns(
        &service_context,
        pagination,
        filter.map(CampaignFilter::from),
        sort,
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(CampaignsResponse::Response(CampaignConnector::from_domain(
        result,
    )))
}
