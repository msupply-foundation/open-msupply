use async_graphql::*;

pub mod mutations;
pub mod query;

use graphql_types::types::PrinterConfigurationConnector;
use mutations::{
    insert_printer_configuration, update_printer_configuration, InsertPrinterConfigurationInput,
    InsertPrinterConfigurationResponse, UpdatePrinterConfigurationInput,
    UpdatePrinterConfigurationResponse,
};
use query::{printer_configurations, PrinterConfigurationFilterInput};

#[derive(Default, Clone)]
pub struct PrinterConfigurationQueries;

#[Object]
impl PrinterConfigurationQueries {
    pub async fn printer_configurations(
        &self,
        ctx: &Context<'_>,
        filter: Option<PrinterConfigurationFilterInput>,
    ) -> Result<PrinterConfigurationConnector> {
        printer_configurations(ctx, filter)
    }
}

#[derive(Default, Clone)]
pub struct PrinterConfigurationMutations;

#[Object]
impl PrinterConfigurationMutations {
    async fn insert_printer_configuration(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertPrinterConfigurationInput,
    ) -> Result<InsertPrinterConfigurationResponse> {
        insert_printer_configuration(ctx, store_id, input)
    }

    async fn update_printer_configuration(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdatePrinterConfigurationInput,
    ) -> Result<UpdatePrinterConfigurationResponse> {
        update_printer_configuration(ctx, store_id, input)
    }
}
