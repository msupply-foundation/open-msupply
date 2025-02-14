use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        RecordAlreadyExist, RecordNotFound, RecordProgramCombinationAlreadyExists,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::PrinterConfigurationNode;
use repository::PrinterConfigurationRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    printer_configuration::{InsertPrinterConfiguration, InsertPrinterConfigurationError},
};
#[derive(InputObject)]
pub struct InsertPrinterConfigurationInput {
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
pub enum InsertPrinterConfigurationResponse {
    Error(InsertError),
    Response(PrinterConfigurationNode),
}

#[derive(Interface)]
#[graphql(name = "InsertPrinterConfigurationErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    PrinterConfigurationDoesNotExist(RecordProgramCombinationAlreadyExists),
    DuplicatePrinterConfiguration(RecordAlreadyExist),
    CreatedRecordNotFound(RecordNotFound),
}

pub fn insert_printer_configuration(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertPrinterConfigurationInput,
) -> Result<InsertPrinterConfigurationResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItems,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .printer_configuration_service
        .insert_printer_configuration(&service_context, input.to_domain());
    map_response(result)
}

impl InsertPrinterConfigurationInput {
    pub fn to_domain(self) -> InsertPrinterConfiguration {
        let InsertPrinterConfigurationInput {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        } = self;

        InsertPrinterConfiguration {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        }
    }
}

pub fn map_response(
    from: Result<PrinterConfigurationRow, InsertPrinterConfigurationError>,
) -> Result<InsertPrinterConfigurationResponse> {
    let result = match from {
        Ok(response) => InsertPrinterConfigurationResponse::Response(
            PrinterConfigurationNode::from_domain(response),
        ),

        Err(error) => InsertPrinterConfigurationResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: InsertPrinterConfigurationError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        InsertPrinterConfigurationError::PrinterConfigurationDoesNotExist => {
            BadUserInput(formatted_error)
        }
        InsertPrinterConfigurationError::DuplicatePrinterConfiguration => {
            BadUserInput(formatted_error)
        }
        InsertPrinterConfigurationError::CreatedRecordNotFound => BadUserInput(formatted_error),
        InsertPrinterConfigurationError::DatabaseError(_) => InternalError(formatted_error),
        InsertPrinterConfigurationError::InternalError(formatted_error) => {
            InternalError(formatted_error)
        }
    };
    Err(graphql_error.extend())
}
