use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

mod mutations;
mod query;
use self::mutations::*;
use self::query::*;

#[derive(Default, Clone)]
pub struct CampaignQueries;

#[Object]
impl CampaignQueries {
    pub async fn campaigns(
        &self,
        ctx: &Context<'_>,
        page: Option<i32>,
        page_size: Option<i32>,
        filter: Option<CampaignFilterInput>,
        sort: Option<Vec<CampaignSortInput>>,
    ) -> Result<CampaignsResponse> {
        get_campaigns(ctx, page, page_size, filter, sort).await
    }

    pub async fn campaign(
        &self, 
        ctx: &Context<'_>, 
        id: String
    ) -> Result<CampaignResponse> {
        get_campaign(ctx, id).await
    }
}

#[derive(Default, Clone)]
pub struct CampaignMutations;

#[Object]
impl CampaignMutations {
    async fn upsert_campaign(
        &self,
        ctx: &Context<'_>,
        input: UpsertCampaignInput,
    ) -> Result<UpsertCampaignResponse> {
        upsert_campaign(ctx, input)
    }

    async fn delete_campaign(
        &self,
        ctx: &Context<'_>,
        input: DeleteCampaignInput,
    ) -> Result<DeleteCampaignResponse> {
        delete_campaign(ctx, input)
    }
}
