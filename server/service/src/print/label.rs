use anyhow::Result;

use crate::settings::LabelPrinterSettingNode;

use super::jetdirect::{Jetdirect, Mode};

const LINE_HEIGHT_IN_DOTS: i32 = 50;

pub fn print_data_matrix_barcode_label(
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
    let mSupply_logo = "
^FO395,217^GFA,1500,1500,25,,::::::N03,N0F,M03E,M0F38,L01FF,L03FF,L03FF87,L01FF07O01F8T038,M0FF1FCN07FET03C,M07F1FCN0F07T01C,M04E1FCN0C03U0C,M0FF07O0C03U0C,L03FF87N01CW0C,L03FF8P0C001C00C38780E1E00C6001,L03F7FFI03C0F00E001E00C79FE0F7F80C7003,L07F3F801EFE3F80FI0E00C1F0707E1C0C3007,L07F9EI0FC771C07C00600C1E038380E0C1806,L07FFEI0783E0C01F00600C1C01838060C180E,L03FF4I0703C0C007C0600C1C01830070C1C0C,L03FE8I060180E001E0600C1C01C30030C0C0C,M0F98I060180EI070600C1C01C30030C0C18,M0FFCI060180EI030600C1C01C30030C0618,M0FF6I060180EI030600C1C01C30030C0638,L01FF3I060180EI030601C1C01830070C033,L01FE180060180EI030601C1C01830060C033,L01FFC80060180E08030603C1E038380E0C03E,K07IFE80060180E1E070706C1F0703C0C0C01E,K07IFE80060180E0FFE03FCC1FFE037FC0C01E,K07FF3F80060180E03F801F8C1CFC033F00C00C,K07FE1F8W01CI03M0C,K03FE1F8W01CI03L018,K03FC1FFW01CI03L018,K02001F8W01CI03L03,K02001EX01CI03K077,K040018X01CI03K07E,,:::::::::::::::::^FS";
    
    let payload = format!(
        r#"
        ^XA
        ^FX CI command parameters:
        ^FX - encoding (28 = UTF-8)
        ^CI28
        ^FO50,{}
        ^BXN,6,200
        ^FD{}^FS       
        {}
        {}
        ^XZ"#,
        vertical_offset, code, formatted_message, mSupply_logo
    );

    // To output QR codes rather than data matrix barcodes, replace this code in the payload variable above:
    // ^BXN,6,200
    // ^FD{}^FS 
    // with this code:
    // ^BQN,2,4
    // ^FDMA,{}^FS
    // for an explanation of how this works, see https://supportcommunity.zebra.com/s/article/ZPL-Command-Information-and-DetailsV2?language=en_US
    
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string(payload, Mode::Print)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionLabelData {
    item_details: String, // usually the amount of units + the item name e.g. "10Tabs Paracetamol 500mg Tablets"
    item_directions: String,
    patient_details: String, // e.g patient name, possibly code etc.
    #[allow(dead_code)] // Warnings will come in the future... this API will likely change!
    warning: Option<String>, // Some items come with a defined warning that should be printed on all labels regardless of directions e.g. avoid sun exposure, avoid alcohol...
    details: String, // General details to include e.g. store name, prescriber name, date/time...
}

pub fn print_prescription_label(
    settings: LabelPrinterSettingNode,
    label_data: Vec<PrescriptionLabelData>,
) -> Result<String> {
    let payload = label_data
        .into_iter()
        .map(|d| {
            let PrescriptionLabelData {
                item_details,
                item_directions,
                patient_details,
                warning: _,
                details,
            } = d;
            format!(
                r#"
                ^XA
                ^FX CI command parameters:
                ^FX - encoding (28 = UTF-8)
                ^CI28

                ^A0,25
                ^FO,10
                ^FB575,3,0,C
                ^FD{item_details}\&^FS

                ^FX Line
                ^FO,65
                ^GB575,2,2^FS

                ^A0,25
                ^FO,75
                ^TB,575,125
                ^FD{item_directions}^FS

                ^FX Line
                ^FO,210
                ^GB575,2,2^FS

                ^A0,20
                ^FO,220
                ^FB575,3,0,C
                ^FD{patient_details}\&{details}\&^FS

                ^XZ
                "#
            )
        })
        .collect::<Vec<String>>()
        .join("\n");
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string(payload, Mode::Print)
}

pub fn host_status(settings: LabelPrinterSettingNode) -> Result<String> {
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string("~HS".to_string(), Mode::Sgd)
}
