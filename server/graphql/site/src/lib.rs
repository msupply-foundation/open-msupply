mod mutations;
pub mod queries;

use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use mutations::{
    assign_stores_to_site, clear_site_token, delete_site, upsert_site, AssignStoresToSiteInput,
    AssignStoresToSiteNode, ClearSiteTokenNode, DeleteSiteNode, UpsertSiteInput,
    UpsertSiteResponse,
};
use queries::{SiteFilterInput, SiteSortInput, SitesResponse};

#[derive(Default, Clone)]
pub struct CentralSiteMutations;

#[Object]
impl CentralSiteMutations {
    pub async fn upsert_site(
        &self,
        ctx: &Context<'_>,
        input: UpsertSiteInput,
    ) -> Result<UpsertSiteResponse> {
        upsert_site(ctx, input)
    }

    pub async fn delete_site(&self, ctx: &Context<'_>, site_id: i32) -> Result<DeleteSiteNode> {
        delete_site(ctx, site_id)
    }

    pub async fn assign_stores_to_site(
        &self,
        ctx: &Context<'_>,
        input: AssignStoresToSiteInput,
    ) -> Result<AssignStoresToSiteNode> {
        assign_stores_to_site(ctx, input)
    }

    pub async fn clear_site_token(
        &self,
        ctx: &Context<'_>,
        site_id: i32,
    ) -> Result<ClearSiteTokenNode> {
        clear_site_token(ctx, site_id)
    }
}

#[derive(Default, Clone)]
pub struct CentralSiteQueries;

#[Object]
impl CentralSiteQueries {
    pub async fn sites(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<SiteFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated)")] sort: Option<
            Vec<SiteSortInput>,
        >,
    ) -> Result<SitesResponse> {
        queries::sites(ctx, page, filter, sort)
    }
}
