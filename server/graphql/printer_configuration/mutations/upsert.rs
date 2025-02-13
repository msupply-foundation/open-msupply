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
    printer_configuration::{UpsertPrinterConfiguration, UpsertPrinterConfigurationError},
};
#[derive(InputObject)]
// #[graphql(name = "UpsertPrinterConfigurationInput")]
pub struct UpsertPrinterConfigurationInput {
    pub id: String,
    pub description: String,
    pub address: String,
    pub port: u16,
    pub label_width: i32,
    pub label_height: i32,
}

#[derive(SimpleObject)]
// #[graphql(name = "UpsertPrinterConfigurationError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
pub enum UpsertPrinterConfigurationResponse {
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

pub fn upsert_printer_configuration(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertPrinterConfigurationInput,
) -> Result<UpsertPrinterConfigurationResponse> {
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
        .upsert_printer_configuration(&service_context, input.to_domain());
    map_response(result)
}

impl UpsertPrinterConfigurationInput {
    pub fn to_domain(self) -> UpsertPrinterConfiguration {
        let UpsertPrinterConfigurationInput {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        } = self;

        UpsertPrinterConfiguration {
            id,
            description,
            address,
            port,
            label_width,
            label_height,
        }
    }
}
// impl UpsertPrinterConfigurationInput {
//     pub fn to_domain(self) -> UpsertPrinterConfiguration {
//         let UpsertPrinterConfigurationInput {
//             id,
//             description,
//             address,
//             port,
//             label_width,
//             label_height,
//         } = self;

//         UpsertPrinterConfiguration {
//             id: self.id.clone(),
//             description: self.description.clone(),
//             address: self.address.clone(),
//             port: self.port.clone(),
//             label_width: self.label_width.clone(),
//             label_height: self.label_height.clone(),
//         }
//     }
// }

// impl PrinterConfigurationInput {
//     pub fn to_domain(&self) -> PrinterConfigurationInput {
//         PrinterConfigurationInput {
//             description: self.description.clone(),
//             address: self.address.clone(),
//             port: self.port.clone(),
//             label_width: self.label_width.clone(),
//             label_height: self.label_height.clone(),
//         }
//     }
// }

pub fn map_response(
    from: Result<PrinterConfigurationRow, UpsertPrinterConfigurationError>,
) -> Result<UpsertPrinterConfigurationResponse> {
    let result = match from {
        Ok(response) => UpsertPrinterConfigurationResponse::Response(
            PrinterConfigurationNode::from_domain(response),
        ),

        Err(error) => UpsertPrinterConfigurationResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: UpsertPrinterConfigurationError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        UpsertPrinterConfigurationError::PrinterConfigurationDoesNotExist => {
            BadUserInput(formatted_error)
        }
        UpsertPrinterConfigurationError::DuplicatePrinterConfiguration => {
            BadUserInput(formatted_error)
        }
        UpsertPrinterConfigurationError::CreatedRecordNotFound => BadUserInput(formatted_error),
        UpsertPrinterConfigurationError::DatabaseError(_) => InternalError(formatted_error),
        UpsertPrinterConfigurationError::InternalError(formatted_error) => {
            InternalError(formatted_error)
        }
    };
    Err(graphql_error.extend())
}
