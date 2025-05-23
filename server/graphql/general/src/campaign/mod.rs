use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::{CampaignFilterInput, CampaignSortInput, CampaignsResponse};

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
        page: Option<PaginationInput>,
        filter: Option<CampaignFilterInput>,
        sort: Option<Vec<CampaignSortInput>>,
        store_id: String,
    ) -> Result<CampaignsResponse> {
        get_campaigns(ctx, page, filter, sort, store_id).await
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
