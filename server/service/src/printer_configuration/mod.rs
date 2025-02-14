pub use self::insert::*;
use crate::service_provider::ServiceContext;
use query::get_printer_configurations;
use repository::{
    printer_configuration::{PrinterConfiguration, PrinterConfigurationFilter},
    PrinterConfigurationRow, RepositoryError, StorageConnection,
};

mod insert;
mod query;
mod update;
mod validate;

pub use update::{
    update_printer_configuration, UpdatePrinterConfiguration, UpdatePrinterConfigurationError,
};

pub trait PrinterConfigurationServiceTrait: Sync + Send {
    fn get_printer_configurations(
        &self,
        connection: &StorageConnection,
        filter: Option<PrinterConfigurationFilter>,
    ) -> Result<Vec<PrinterConfiguration>, RepositoryError> {
        get_printer_configurations(connection, filter)
    }

    fn insert_printer_configuration(
        &self,
        ctx: &ServiceContext,
        input: InsertPrinterConfiguration,
    ) -> Result<PrinterConfigurationRow, InsertPrinterConfigurationError> {
        insert_printer_configuration(ctx, input)
    }

    fn update_printer_configuration(
        &self,
        ctx: &ServiceContext,
        input: UpdatePrinterConfiguration,
    ) -> Result<PrinterConfigurationRow, UpdatePrinterConfigurationError> {
        update_printer_configuration(ctx, input)
    }
}
pub struct PrinterConfigurationService {}
impl PrinterConfigurationServiceTrait for PrinterConfigurationService {}
