use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::SiteRowRepository;
use service::auth::{Resource, ResourceAccessRequest};

mod mutations;
use self::mutations::*;

#[derive(Default, Clone)]
pub struct SiteQueries;

#[derive(SimpleObject)]
pub struct SiteConnector {
    pub total_count: u32,
    pub nodes: Vec<SiteNode>,
}

#[Object]
impl SiteQueries {
    pub async fn sites(&self, ctx: &Context<'_>, store_id: String) -> Result<SiteConnector> {
        // validate_auth(
        //     ctx,
        //     &ResourceAccessRequest {
        //         resource: Resource::ServerAdmin, // TODO?
        //         store_id: Some(store_id.clone()),
        //     },
        // )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id, "".to_string())?;

        // TODO: service layer!
        let site_repo = SiteRowRepository::new(&service_context.connection);

        let sites = site_repo.get_all()?;

        Ok(SiteConnector {
            total_count: sites.len() as u32,
            nodes: SiteNode::from_vec(sites),
        })
    }
}

#[derive(Default, Clone)]
pub struct SiteMutations;

#[Object]
impl SiteMutations {
    async fn insert_site(
        &self,
        ctx: &Context<'_>,
        input: InsertSiteInput,
    ) -> Result<InsertResponse> {
        insert_site(ctx, input)
    }
}
