use crate::queries::site::SiteNode;
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    site::upsert::UpsertSite,
};

#[derive(InputObject)]
pub struct UpsertSiteInput {
    pub id: i32,
    pub name: String,
    pub password: Option<String>,
    pub clear_hardware_id: Option<bool>,
}

pub fn upsert_site(ctx: &Context<'_>, input: UpsertSiteInput) -> Result<SiteNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSites,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .site_service
        .upsert_site(&service_context, input.to_domain())
        .map_err(StandardGraphqlError::from)?;

    Ok(SiteNode { site: result })
}

impl UpsertSiteInput {
    pub fn to_domain(self) -> UpsertSite {
        let UpsertSiteInput {
            id,
            name,
            password,
            clear_hardware_id,
        } = self;

        UpsertSite {
            id,
            name,
            password,
            clear_hardware_id: clear_hardware_id.unwrap_or(false),
        }
    }
}
