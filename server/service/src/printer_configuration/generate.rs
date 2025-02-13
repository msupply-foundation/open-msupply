use repository::PrinterConfigurationRow;

use super::upsert::UpsertPrinterConfiguration;

pub fn generate(
    UpsertPrinterConfiguration {
        id,
        description,
        address,
        port,
        label_width,
        label_height,
    }: UpsertPrinterConfiguration,
) -> PrinterConfigurationRow {
    PrinterConfigurationRow {
        id,
        description,
        address,
        port: port.into(),
        label_width,
        label_height,
    }
}
