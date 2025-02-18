use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        RecordAlreadyExist, RecordNotFound, RecordProgramCombinationAlreadyExists,
    },
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

#[derive(SimpleObject)]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
pub enum UpdatePrinterResponse {
    Error(UpdateError),
    Response(PrinterNode),
}

#[derive(Interface)]
#[graphql(name = "UpdatePrinterErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    PrinterDoesNotExist(RecordProgramCombinationAlreadyExists),
    DuplicatePrinter(RecordAlreadyExist),
    CreatedRecordNotFound(RecordNotFound),
}

impl From<UpdatePrinterInput> for UpdatePrinter {
    fn from(
        UpdatePrinterInput {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        }: UpdatePrinterInput,
    ) -> Self {
        Self {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        }
    }
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

    let result = service_provider
        .printer_service
        .update_printer(&service_context, input.into());
    let result = match result {
        Ok(printer) => UpdatePrinterResponse::Response(PrinterNode::from_domain(printer)),
        Err(error) => UpdatePrinterResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };
    Ok(result)
}

fn map_error(error: UpdatePrinterError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        UpdatePrinterError::PrinterDoesNotExist => BadUserInput(formatted_error),
        UpdatePrinterError::DuplicatePrinterDescription => BadUserInput(formatted_error),
        UpdatePrinterError::DuplicatePrinterAddress => BadUserInput(formatted_error),
        UpdatePrinterError::DatabaseError(_) => InternalError(formatted_error),
        UpdatePrinterError::InternalError(formatted_error) => InternalError(formatted_error),
    };
    Err(graphql_error.extend())
}
