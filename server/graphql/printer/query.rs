use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    simple_generic_errors::NodeError,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{PrinterConnector, PrinterNode};

use repository::{printer::PrinterFilter, EqualFilter, RepositoryError, StringFilter};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum PrinterResponse {
    Error(NodeError),
    Response(PrinterNode),
}

#[derive(InputObject, Clone)]
pub struct PrinterFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub description: Option<StringFilterInput>,
    pub address: Option<EqualFilterStringInput>,
}

pub async fn printers(
    ctx: &Context<'_>,
    filter: Option<PrinterFilterInput>,
) -> Result<PrinterConnector> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let domain_filter = filter.map(|f| f.to_domain());

    let printers = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let context = service_provider.basic_context()?;
        service_provider
            .printer_service
            .get_printers(&context.connection, domain_filter)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(PrinterConnector::from_vec(printers))
}

impl PrinterFilterInput {
    pub fn to_domain(self) -> PrinterFilter {
        PrinterFilter {
            id: self.id.map(EqualFilter::from),
            description: self.description.map(StringFilter::from),
            address: self.address.map(EqualFilter::from),
        }
    }
}
