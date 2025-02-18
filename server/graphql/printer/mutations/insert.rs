use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::PrinterNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    printer::{InsertPrinter, InsertPrinterError},
};
#[derive(InputObject)]
pub struct InsertPrinterInput {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

#[derive(Union)]
pub enum InsertPrinterResponse {
    Response(PrinterNode),
}

pub fn insert_printer(
    ctx: &Context<'_>,
    input: InsertPrinterInput,
) -> Result<InsertPrinterResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let InsertPrinterInput {
        id,
        description,
        address,
        port,
        label_width,
        label_height,
    } = input;

    let result = service_provider.printer_service.insert_printer(
        &service_context,
        InsertPrinter {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        },
    );

    let response = match result {
        Ok(printer) => InsertPrinterResponse::Response(PrinterNode::from_domain(printer)),

        Err(error) => map_error(error)?,
    };
    Ok(response)
}

fn map_error(error: InsertPrinterError) -> Result<InsertPrinterResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        InsertPrinterError::PrinterAlreadyExists
        | InsertPrinterError::DuplicatePrinterDescription
        | InsertPrinterError::DuplicatePrinterAddress => BadUserInput(formatted_error),
        InsertPrinterError::CreatedRecordNotFound => InternalError(formatted_error),
        InsertPrinterError::DatabaseError(_) => InternalError(formatted_error),
        InsertPrinterError::InternalError(_) => InternalError(formatted_error),
    };
    Err(graphql_error.extend())
}
