use async_graphql::*;
use graphql_core::simple_generic_errors::InternalError;
use repository::{printer::Printer, PrinterRow};

#[derive(PartialEq, Debug)]
pub struct PrinterNode {
    printer: Printer,
}

#[derive(SimpleObject)]
pub struct PrinterConnector {
    total_count: u32,
    nodes: Vec<PrinterNode>,
}

#[Object]
impl PrinterNode {
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
pub enum PrinterResponseError {
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct PrinterError {
    pub error: PrinterResponseError,
}

#[derive(Union)]
pub enum PrinterResponse {
    Error(PrinterError),
    Response(PrinterNode),
}

impl PrinterNode {
    pub fn from_domain(printer: Printer) -> PrinterNode {
        PrinterNode { printer }
    }

    pub fn row(&self) -> &PrinterRow {
        &self.printer
    }
}

pub fn from_vec(printers: Vec<Printer>) -> Vec<PrinterNode> {
    printers.into_iter().map(PrinterNode::from_domain).collect()
}

impl PrinterConnector {
    pub fn from_vec(printers: Vec<Printer>) -> PrinterConnector {
        let total_count = printers.len() as u32;
        let nodes = printers.into_iter().map(PrinterNode::from_domain).collect();

        PrinterConnector { total_count, nodes }
    }
}

//TODO: add tests
