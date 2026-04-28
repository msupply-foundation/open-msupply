mod mutations;
pub mod queries;

use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use mutations::{upsert_site, UpsertSiteInput, UpsertSiteResponse};
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
