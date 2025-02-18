use anyhow::Result;

use crate::settings::LabelPrinterSettingNode;

use super::jetdirect::{Jetdirect, Mode};

const LINE_HEIGHT_IN_DOTS: i32 = 50;

pub fn print_qr_code(
    settings: LabelPrinterSettingNode,
    code: String,
    message: Option<String>,
) -> Result<String> {
    let qr_height = 133; // approx height in dots for the magnification factor of 4 when printing a uuid
    let vertical_offset = (settings.label_height - qr_height) / 2;
    let formatted_message = match message {
        Some(msg) => {
            // adding max to ensure that the y is not negative
            let mut y = (vertical_offset - LINE_HEIGHT_IN_DOTS).max(0);

            msg.split('\n')
                .map(|line| {
                    y += LINE_HEIGHT_IN_DOTS;
                    format!("^FO200,{}^A0,32,25^FD{}^FS", y, line)
                })
                .collect::<Vec<_>>()
                .join("\n")
        }
        None => "".to_string(),
    };

    let payload = format!(
        r#"
        ^XA
        ^FO50,{}
        ^BQN,2,4
        ^FDMA,{}^FS        
        {}
        ^XZ"#,
        vertical_offset, code, formatted_message
    );
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string(payload, Mode::Print)
}

#[derive(serde::Deserialize)]
pub struct PrescriptionLabelData {
    item_name: String,
    item_directions: String,
    patient_name: String,
    warning: Option<String>,
    details: String,
}

pub fn print_prescription_label(
    settings: LabelPrinterSettingNode,
    label_data: PrescriptionLabelData,
) -> Result<String> {
    let PrescriptionLabelData {
        item_name,
        item_directions,
        patient_name,
        details,
        warning,
    } = label_data;
    let warning = warning.unwrap_or_default();

    let payload = format!(
        r#"
        ^XA
        ^A0,40
        ^FO20,10
        ^FB500,1,0,C
        ^FD{item_name}^FS

        ^FO20,50^GB500,1,2^FS ; Horizontal line

        ^A0,30
        ^FO20,60
        ^FB500,3,0,L
        ^FD{item_directions}^FS
        
        ^A0,30
        ^FO20,160
        ^FB500,3,0,L
        ^FD{warning}^FS

        ^A0,20
        ^FO20,210
        ^FD{patient_name}^FS

        ^FO20,230^GB500,1,2^FS ; Horizontal line

        ^A0,20
        ^FO20,250
        ^FD{details}^FS
        ^XZ"#
    );
    let printer = Jetdirect::new(settings.address, settings.port); // This (and QR labels!) should be moved to using the new printer config table in some manner. Either FE sends the details or backend does query to get them (FE should probably already have them though)
    printer.send_string(payload, Mode::Print)
}

pub fn host_status(settings: LabelPrinterSettingNode) -> Result<String> {
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string("~HS".to_string(), Mode::Sgd)
}
