use async_graphql::*;
use graphql_core::simple_generic_errors::InternalError;
use repository::{printer_configuration::PrinterConfiguration, PrinterConfigurationRow};

#[derive(PartialEq, Debug)]
pub struct PrinterConfigurationNode {
    printer_configuration: PrinterConfiguration,
}

#[derive(SimpleObject)]
pub struct PrinterConfigurationConnector {
    total_count: u32,
    nodes: Vec<PrinterConfigurationNode>,
}

#[Object]
impl PrinterConfigurationNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn description(&self) -> &str {
        &self.row().description
    }

    pub async fn address(&self) -> &str {
        &self.row().address
    }

    pub async fn port(&self) -> &i32 {
        &self.row().port
    }

    pub async fn label_width(&self) -> i32 {
        self.row().label_width
    }

    pub async fn label_height(&self) -> i32 {
        self.row().label_height.clone()
    }
}

#[derive(Union)]
pub enum PrinterConfigurationResponseError {
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct PrinterConfigurationError {
    pub error: PrinterConfigurationResponseError,
}

#[derive(Union)]
pub enum PrinterConfigurationResponse {
    Error(PrinterConfigurationError),
    Response(PrinterConfigurationNode),
}

impl PrinterConfigurationNode {
    pub fn from_domain(printer_configuration: PrinterConfiguration) -> PrinterConfigurationNode {
        PrinterConfigurationNode {
            printer_configuration,
        }
    }

    pub fn row(&self) -> &PrinterConfigurationRow {
        &self.printer_configuration
    }
}

pub fn from_vec(
    printer_configurations: Vec<PrinterConfiguration>,
) -> Vec<PrinterConfigurationNode> {
    printer_configurations
        .into_iter()
        .map(PrinterConfigurationNode::from_domain)
        .collect()
}

impl PrinterConfigurationConnector {
    pub fn from_vec(
        printer_configurations: Vec<PrinterConfiguration>,
    ) -> PrinterConfigurationConnector {
        let total_count = printer_configurations.len() as u32;
        let nodes = printer_configurations
            .into_iter()
            .map(PrinterConfigurationNode::from_domain)
            .collect();

        PrinterConfigurationConnector { total_count, nodes }
    }
}

//TODO: add tests
