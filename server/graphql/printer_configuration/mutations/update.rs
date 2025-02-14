use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        RecordAlreadyExist, RecordNotFound, RecordProgramCombinationAlreadyExists,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::PrinterConfigurationNode;

use service::{
    auth::{Resource, ResourceAccessRequest},
    printer_configuration::{UpdatePrinterConfiguration, UpdatePrinterConfigurationError},
};
#[derive(InputObject)]
pub struct UpdatePrinterConfigurationInput {
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
pub enum UpdatePrinterConfigurationResponse {
    Error(UpdateError),
    Response(PrinterConfigurationNode),
}

#[derive(Interface)]
#[graphql(name = "UpdatePrinterConfigurationErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    PrinterConfigurationDoesNotExist(RecordProgramCombinationAlreadyExists),
    DuplicatePrinterConfiguration(RecordAlreadyExist),
    CreatedRecordNotFound(RecordNotFound),
}

impl From<UpdatePrinterConfigurationInput> for UpdatePrinterConfiguration {
    fn from(
        UpdatePrinterConfigurationInput {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        }: UpdatePrinterConfigurationInput,
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

pub fn update_printer_configuration(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdatePrinterConfigurationInput,
) -> Result<UpdatePrinterConfigurationResponse> {
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
        .update_printer_configuration(&service_context, input.into());
    let result = match result {
        Ok(printer_configuration) => UpdatePrinterConfigurationResponse::Response(
            PrinterConfigurationNode::from_domain(printer_configuration),
        ),
        Err(error) => UpdatePrinterConfigurationResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };
    Ok(result)
}

fn map_error(error: UpdatePrinterConfigurationError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        UpdatePrinterConfigurationError::PrinterConfigurationDoesNotExist => {
            BadUserInput(formatted_error)
        }
        UpdatePrinterConfigurationError::DatabaseError(_) => InternalError(formatted_error),
        UpdatePrinterConfigurationError::InternalError(formatted_error) => {
            InternalError(formatted_error)
        }
    };
    Err(graphql_error.extend())
}
