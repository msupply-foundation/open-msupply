use crate::PrinterConfigurationRow;

pub fn mock_printer_configuration_a() -> PrinterConfigurationRow {
    PrinterConfigurationRow {
        id: "Printer1".to_owned(),
        description: "Room one".to_owned(),
        address: "111.222.1.222".to_owned(),
        port: 0000.to_owned(),
        label_width: 70.to_owned(),
        label_height: 30.to_owned(),
    }
}

pub fn mock_printer_configuration_b() -> PrinterConfigurationRow {
    PrinterConfigurationRow {
        id: "Printer2".to_owned(),
        description: "Room two".to_owned(),
        address: "111.222.3.444".to_owned(),
        port: 0000.to_owned(),
        label_width: 75.to_owned(),
        label_height: 40.to_owned(),
    }
}

pub fn mock_printer_configuration() -> Vec<PrinterConfigurationRow> {
    vec![
        mock_printer_configuration_a(),
        mock_printer_configuration_b(),
    ]
}
