use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::PrinterNode;

use service::{
    auth::{Resource, ResourceAccessRequest},
    printer::{UpdatePrinter, UpdatePrinterError},
};
#[derive(InputObject)]
pub struct UpdatePrinterInput {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

#[derive(Union)]
pub enum UpdatePrinterResponse {
    Response(PrinterNode),
}

pub fn update_printer(
    ctx: &Context<'_>,
    input: UpdatePrinterInput,
) -> Result<UpdatePrinterResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let UpdatePrinterInput {
        id,
        description,
        address,
        port,
        label_width,
        label_height,
    } = input;

    let result = service_provider.printer_service.update_printer(
        &service_context,
        UpdatePrinter {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        },
    );

    let response = match result {
        Ok(printer) => UpdatePrinterResponse::Response(PrinterNode::from_domain(printer)),

        Err(error) => map_error(error)?,
    };
    Ok(response)
}

fn map_error(error: UpdatePrinterError) -> Result<UpdatePrinterResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        UpdatePrinterError::PrinterDoesNotExist
        | UpdatePrinterError::DuplicatePrinterDescription
        | UpdatePrinterError::DuplicatePrinterAddress => BadUserInput(formatted_error),
        UpdatePrinterError::DatabaseError(_) => InternalError(formatted_error),
        UpdatePrinterError::InternalError(_) => InternalError(formatted_error),
    };
    Err(graphql_error.extend())
}
