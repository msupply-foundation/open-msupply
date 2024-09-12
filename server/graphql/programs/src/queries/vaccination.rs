use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::VaccinationNode;
use repository::RepositoryError;
use service::auth::{Resource, ResourceAccessRequest};

pub fn vaccination(
    ctx: &Context<'_>,
    store_id: String,
    id: String,
) -> Result<Option<VaccinationNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryEncounter,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    match service_provider
        .vaccination_service
        .get_vaccination(&context, id)
    {
        Ok(vaccination) => {
            let result = VaccinationNode::from_domain(vaccination);
            Ok(Some(result))
        }
        Err(err) => match err {
            RepositoryError::NotFound => Ok(None),
            _ => Err(StandardGraphqlError::from_repository_error(err)),
        },
    }
}
