use crate::PrinterRow;

pub fn mock_printer_a() -> PrinterRow {
    PrinterRow {
        id: "Printer1".to_string(),
        description: "Room one".to_string(),
        address: "111.222.1.222".to_string(),
        port: 0000.to_owned(),
        label_width: 70.to_owned(),
        label_height: 30.to_owned(),
    }
}

pub fn mock_printer_b() -> PrinterRow {
    PrinterRow {
        id: "Printer2".to_string(),
        description: "Room two".to_string(),
        address: "111.222.3.444".to_string(),
        port: 0000.to_owned(),
        label_width: 75.to_owned(),
        label_height: 40.to_owned(),
    }
}

pub fn mock_printers() -> Vec<PrinterRow> {
    vec![mock_printer_a(), mock_printer_b()]
}
