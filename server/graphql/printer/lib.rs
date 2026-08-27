use async_graphql::*;

pub mod mutations;
pub mod query;

use graphql_types::types::PrinterConnector;
use mutations::{
    insert_printer, update_printer, InsertPrinterInput, InsertPrinterResponse, UpdatePrinterInput,
    UpdatePrinterResponse,
};
use query::{printers, PrinterFilterInput};

#[derive(Default, Clone)]
pub struct PrinterQueries;

#[Object]
impl PrinterQueries {
    pub async fn printers(
        &self,
        ctx: &Context<'_>,
        filter: Option<PrinterFilterInput>,
    ) -> Result<PrinterConnector> {
        printers(ctx, filter)
    }
}

#[derive(Default, Clone)]
pub struct PrinterMutations;

#[Object]
impl PrinterMutations {
    async fn insert_printer(
        &self,
        ctx: &Context<'_>,
        input: InsertPrinterInput,
    ) -> Result<InsertPrinterResponse> {
        insert_printer(ctx, input)
    }

    async fn update_printer(
        &self,
        ctx: &Context<'_>,
        input: UpdatePrinterInput,
    ) -> Result<UpdatePrinterResponse> {
        update_printer(ctx, input)
    }
}
