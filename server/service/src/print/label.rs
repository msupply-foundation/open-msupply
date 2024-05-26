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

pub fn host_status(settings: LabelPrinterSettingNode) -> Result<String> {
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string("~HS".to_string(), Mode::Sgd)
}
