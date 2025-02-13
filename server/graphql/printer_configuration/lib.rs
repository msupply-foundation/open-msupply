use async_graphql::*;

pub mod mutations;
pub mod query;
// use self::mutations::*;

use graphql_types::types::PrinterConfigurationConnector;
use mutations::{
    upsert_printer_configuration, UpsertPrinterConfigurationInput,
    UpsertPrinterConfigurationResponse,
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
    async fn upsert_printer_configuration(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpsertPrinterConfigurationInput,
    ) -> Result<UpsertPrinterConfigurationResponse> {
        upsert_printer_configuration(ctx, store_id, input)
    }
}
