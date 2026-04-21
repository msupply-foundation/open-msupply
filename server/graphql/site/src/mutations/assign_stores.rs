use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    site::assign_stores::{
        AssignStoresToSite, AssignStoresToSiteError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct AssignStoresToSiteInput {
    pub site_id: i32,
    pub store_ids: Vec<String>,
}

#[derive(SimpleObject)]
pub struct AssignStoresToSiteNode {
    pub site_id: i32,
    pub store_ids: Vec<String>,
}

pub fn assign_stores_to_site(
    ctx: &Context<'_>,
    input: AssignStoresToSiteInput,
) -> Result<AssignStoresToSiteNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSites,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let site_id = input.site_id;
    let store_ids = service_provider
        .site_service
        .assign_stores_to_site(
            &service_context,
            AssignStoresToSite {
                site_id: input.site_id,
                store_ids: input.store_ids,
            },
        )
        .map_err(map_error)?;

    Ok(AssignStoresToSiteNode {
        site_id,
        store_ids,
    })
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::SiteDoesNotExist => BadUserInput(formatted_error),
        ServiceError::StoreDoesNotExist(_) => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    graphql_error.extend()
}
