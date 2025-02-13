pub use self::upsert::*;
use crate::service_provider::ServiceContext;
use query::get_printer_configurations;
use repository::{
    printer_configuration::{PrinterConfiguration, PrinterConfigurationFilter},
    PrinterConfigurationRow, RepositoryError, StorageConnection,
};

mod generate;
mod query;
mod upsert;
mod validate;

pub use generate::generate;
pub use validate::validate;

pub trait PrinterConfigurationServiceTrait: Sync + Send {
    fn get_printer_configurations(
        &self,
        connection: &StorageConnection,
        filter: Option<PrinterConfigurationFilter>,
    ) -> Result<Vec<PrinterConfiguration>, RepositoryError> {
        get_printer_configurations(connection, filter)
    }

    fn upsert_printer_configuration(
        &self,
        ctx: &ServiceContext,
        input: UpsertPrinterConfiguration,
    ) -> Result<PrinterConfigurationRow, UpsertPrinterConfigurationError> {
        upsert_printer_configuration(ctx, input)
    }
}
pub struct PrinterConfigurationService {}
impl PrinterConfigurationServiceTrait for PrinterConfigurationService {}
