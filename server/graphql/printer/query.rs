use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    simple_generic_errors::NodeError,
    standard_graphql_error::validate_auth,
    ContextExt,
};
use graphql_types::types::{PrinterConnector, PrinterNode};

use repository::{printer::PrinterFilter, EqualFilter, StringFilter};
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

pub fn printers(ctx: &Context<'_>, filter: Option<PrinterFilterInput>) -> Result<PrinterConnector> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let printer_service = &service_provider.printer_service;
    let printers =
        printer_service.get_printers(&context.connection, filter.map(|f| f.to_domain()))?;

    let response = PrinterConnector::from_vec(printers);

    Ok(response)
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
