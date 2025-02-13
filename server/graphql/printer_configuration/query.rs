use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    simple_generic_errors::NodeError,
    standard_graphql_error::validate_auth,
    ContextExt,
};
use graphql_types::types::{PrinterConfigurationConnector, PrinterConfigurationNode};

use repository::{printer_configuration::PrinterConfigurationFilter, EqualFilter, StringFilter};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum PrinterConfigurationResponse {
    Error(NodeError),
    Response(PrinterConfigurationNode),
}

#[derive(InputObject, Clone)]
pub struct PrinterConfigurationFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub description: Option<StringFilterInput>,
    pub address: Option<EqualFilterStringInput>,
}

pub fn printer_configurations(
    ctx: &Context<'_>,
    filter: Option<PrinterConfigurationFilterInput>,
) -> Result<PrinterConfigurationConnector> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let printer_configuration_service = &service_provider.printer_configuration_service;
    let printer_configurations = printer_configuration_service
        .get_printer_configurations(&context.connection, filter.map(|f| f.to_domain()))?;

    let response = PrinterConfigurationConnector::from_vec(printer_configurations);

    Ok(response)
}

impl PrinterConfigurationFilterInput {
    pub fn to_domain(self) -> PrinterConfigurationFilter {
        PrinterConfigurationFilter {
            id: self.id.map(EqualFilter::from),
            description: self.description.map(StringFilter::from),
            address: self.address.map(EqualFilter::from),
        }
    }
}
