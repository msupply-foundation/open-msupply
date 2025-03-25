use anyhow::Result;

use crate::settings::LabelPrinterSettingNode;

use super::jetdirect::{Jetdirect, Mode};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetLabelData {
    code: String,
    asset_number: Option<String>,
    date_printed: Option<String>
}

pub fn print_asset_label(
    settings: LabelPrinterSettingNode,
    data: AssetLabelData,
) -> Result<String> {

    let asset_number = data.asset_number.unwrap_or_default();

    let date_printed = data.date_printed.unwrap_or_default();

    let m_supply_logo = "^FO265,114^GFA,6360,6360,40,,:::::::::::::V07,V0F,U01F,U07F,U0FF,T03FE,T0FFE,S03FFE,S07FFE,S07FFC,R01IFC,Q01JFC,Q0KFC,P07IF9IF,O01JF0FFE,O07IFC1FFE,O0JFCIF8,N03JFBIF,N07NF,:N0OF,M01OF8003FFE,M01OFC003FFE,M01OFE003IF,:N0OFE003FFE,N07NFC001FFC,N03NFCI0FF8,N01NFC001FFC,O0NF8003FFE,O03MF800JF8,O01MF800JF8,P0MF800JF8,P07LFI0JF8,::P03LFI0JF8,P03KFEI0JF8,P01KF8I0JF8,Q0KFJ0JF8,Q0EJFJ0JF8,Q0E1IFCI0JF8,P07FC7FFEI0JF8,O01LFEI0JF8,O07MFI0JF8,O0NF800JF8,N03NFC00JF8,N07NFC00JF8,N0OFE007IF,M01OFE,M01PF,M03PF,M03IFE3KFL07,M03JF00IFE42I03E,M03JFE03FFEEKF8,M03KFC3FFCKFE,M03KFE3FFDKF8,M07KFC3FFBJFE,M07JFE03FF7JF8,M07JF801FEJFC,M07LF079IFE,M07KFE007IFM07C3F87C7F,M07KFCC0IFCM0E639CEE7F8,M07LFCJFCM0C330CEE718,M07LFDJFEL018330CFE718,M07QFEL01C330CE0618,M07QFEM0C739CE0618,M07QFCM0FE3F87E618,M03QF8M03C3F03C2,M03OFCFP03,M03OF9EP03P03C,M01OF1CP01O03FFCgJ01E,N0NFE38g07IFgJ03E,N07MF838Y01JF8gI03E,N03MF078Y03JF8gI03E,O0LF80Fg03F81F8gI03E,O03JFE03Fg07E007gJ03E,P0JF007Fg07CgM03E,O060FF001FEg0FCgM03E,O03CJ0FFEg0FCgM03E,O03FE01JFR0EI0EI0FCU038L0EI03E,O03NFEN0F07F807FC00FCK0F8003E01E1FFI0787FC003E07CI0F8,O03OFN0F1FFE0IF007CK0F8003E01E7FFC0079IF003E07C001F8,O07OFCM0F3FFE1IF007EK0F8003E03JFE00KF803E07E001F,O07MFCFEM0KF3IF803F8J0F8003E03KF00KFC03E03E001F,O07MF87FM0FF83FFC1F803FCJ0F8003E03FE03F80FF80FE03E03E003E,O07MF83F8L0FF01FF00FC01FF8I0F8003E03FC01F80FF007E03E03F003E,O07MF01FCL0FE00FF007C00FFEI0F8003E03F800FC0FE003E03E01F003E,O07LFE00FEL0FC00FE007C003FF800F8003E03FI07C0FC001F03E01F807C,O0MFC387EL0F800FC007CI0FFE00F8003E03FI07C0FC001F03E00F807C,N01MFC787FL0F800FC007CI03FF00F8003E03FI07C0FC001F03E00F807C,N01MF8703F8K0F800FC007CJ0FF80F8003E03EI03E0F8I0F03E007C0F8,N01MF0E01F8K0F800F8007CJ03F80F8003E03EI03E0F8I0F03E007C0F8,N01MF3C71FCK0F800F8007CK0FC0F8003E03EI03E0F8I0F03E007C1F,N03NFDF0FCK0FI0F8007CK07C0F8003E03EI03E0F8I0F03E003E1F,N03OFE0FCK0FI0F8007CK07C0F8003E03EI03E0F8I0F03E003E1E,N03OFE07EK0FI0F8007CK07E0F8007E03FI07C0FC001F03E001F3E,N07PFE7EK0FI0F8007CK07E0F8007E03FI07C0FC001F03E001F3E,I01CI07PFE7EK0FI0F8007CK07C0F8007E03FI07C0FC001F03EI0F7C,I03UFC7EK0FI0F8007C02I07C0FC00FE03F800FC0FE003F03EI0FFC,I03UFE7EK0FI0F8007C07800FC07C01FE03FC01F80FF007E03EI0FFC,I03UFE7FK0FI0F8007C0FE01F807E03FE03FE03F80FF80FE01FI07F8,I03UFE7FK0FI0F8007C0KF807JFE03FF8FF00FFE3FC01FC007F8,I07VF7FK0FI0F8007C07JF003IFBE03JFE00KF801FE003F,I07PF9MFK0FI0F8007C03IFE003IF3E03F7FFC00FDIFI0FE003F,I07PF8MFK0FI078007C00IF8001FFC3E03E3FF800F8FFEI07E003F,I07PF07LFW01FEJ03FJ03E0FCI0F83FK08003E,I07OFE03LFgP03EL0F8P03E,I07OFC01KFEgP03EL0F8P03C,I03OF801KFCgP03EL0F8P07C,I01OFI0KFCgP03EL0F8P07C,I01NFEI0KFCgP03EL0F8P0F8,I01NFCI07JF8gP03EL0F8N033F8,J0NF8I07JF8gP03EL0F8N07FF,J0NFJ07JF8gP03EL0F8N07FE,J0NFJ07JF8gP01EL078N07FC,J0MFEJ03JF87F8hK01E,J0MFEJ03MFE,J0MFCJ03MFE,J0FE003FFCJ03MFC,J0FCP07MF8,J0FCP07KF,J0FCP07JF8,J0F8P07IFE,I01FQ07IF8,I01EQ0IFE,I01CQ0IF8,I01CQ07FE,I018Q07F8,I018Q0FC,I01R04,,:::::::::::::^FS";
    
    let payload = format!(
        r#"
        ^XA
        ^FX CI command parameters:
        ^FX - encoding (28 = UTF-8)
        ^CI28
        ^FO18,18
        ^BXN,11,200
        ^FD{}^FS
        ^FO277,18^A0,32,25^FDAsset Number: {}^FS
        ^FO277,73^A0,32,25^FDDate Printed: {}^FS
        {}
        ^XZ"#,
        data.code, asset_number, date_printed, m_supply_logo
    );

    // To output QR codes rather than data matrix barcodes:
    // In the payload variable above, there are these three lines of code:
    // ^FO18,18
    // ^BXN,11,200
    // ^FD{}^FS
    // Replace them with these three lines of code:
    // ^FO22,12
    // ^BQN,2,8
    // ^FDMA,{}^FS
    // For an explanation of how this works, see https://supportcommunity.zebra.com/s/article/ZPL-Command-Information-and-DetailsV2?language=en_US
    // And if you want to make the new label look its best, play with the spacing of things at labelary.com/viewer.html

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
