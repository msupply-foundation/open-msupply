use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{RecordAlreadyExist, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::PrinterNode;
use repository::PrinterRow;
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

#[derive(SimpleObject)]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
pub enum InsertPrinterResponse {
    Error(InsertError),
    Response(PrinterNode),
}

#[derive(Interface)]
#[graphql(name = "InsertPrinterErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    DuplicatePrinter(RecordAlreadyExist),
    CreatedRecordNotFound(RecordNotFound),
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

    let result = service_provider
        .printer_service
        .insert_printer(&service_context, input.to_domain());
    map_response(result)
}

impl InsertPrinterInput {
    pub fn to_domain(self) -> InsertPrinter {
        let InsertPrinterInput {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        } = self;

        InsertPrinter {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        }
    }
}

pub fn map_response(from: Result<PrinterRow, InsertPrinterError>) -> Result<InsertPrinterResponse> {
    let result = match from {
        Ok(response) => InsertPrinterResponse::Response(PrinterNode::from_domain(response)),

        Err(error) => InsertPrinterResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: InsertPrinterError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        InsertPrinterError::PrinterAlreadyExists => BadUserInput(formatted_error),
        InsertPrinterError::DuplicatePrinterDescription => BadUserInput(formatted_error),
        InsertPrinterError::DuplicatePrinterAddress => BadUserInput(formatted_error),
        InsertPrinterError::CreatedRecordNotFound => BadUserInput(formatted_error),
        InsertPrinterError::DatabaseError(_) => InternalError(formatted_error),
        InsertPrinterError::InternalError(formatted_error) => InternalError(formatted_error),
    };
    Err(graphql_error.extend())
}
