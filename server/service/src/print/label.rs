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
        ^FX CI command parameters:
        ^FX - encoding (28 = UTF-8)
        ^CI28
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
#[serde(rename_all = "camelCase")]
pub struct PrescriptionLabelData {
    item_name: String,
    item_directions: String,
    patient_details: String, // e.g patient name, possibly code etc.
    warning: Option<String>, // Some items come with a defined warning (OG field "Message") that should be printed on all labels regardless of directions e.g. avoid sun exposure, avoid alcohol...
    details: String, // General details to include e.g. store name, prescriber name, date/time...
}

pub fn print_prescription_label(
    settings: LabelPrinterSettingNode,
    label_data: PrescriptionLabelData,
) -> Result<String> {
    let PrescriptionLabelData {
        item_name,
        item_directions,
        patient_details,
        warning,
        details,
    } = label_data;
    let warning = warning.unwrap_or_default();

    let payload = format!(
        r#"
^XA
^FX CI command parameters:
^FX - encoding (28 = UTF-8)
^CI28

^A0,25
^FO20,10
^FB550,1,0,C
^FD{item_name}\&^FS

^FO20,50
^GB550,2,2^FS

^A0,25
^FO20,60
^FB550,6,0,L
^FD{item_directions}\&{warning}^FS

^FO20,210
^GB550,2,2^FS

^A0,25
^FO20,220
^FD{patient_details}^FS

^A0,25
^FO20,250
^FD{details}^FS
^XZ
"#
    );
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string(payload, Mode::Print)
}

pub fn host_status(settings: LabelPrinterSettingNode) -> Result<String> {
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string("~HS".to_string(), Mode::Sgd)
}
