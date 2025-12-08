use anyhow::Result;

use crate::settings::LabelPrinterSettingNode;

use super::jetdirect::{Jetdirect, Mode};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetLabelData {
    code: String,
    asset_number: Option<String>,
    date_printed: Option<String>,
}

pub fn get_asset_label(data: AssetLabelData) -> String {
    let asset_number = data.asset_number.unwrap_or_default();

    let date_printed = data.date_printed.unwrap_or_default();

    let m_supply_logo = "^FO265,114^GFA,6360,6360,40,,:::::::::::::V07,V0F,U01F,U07F,U0FF,T03FE,T0FFE,S03FFE,S07FFE,S07FFC,R01IFC,Q01JFC,Q0KFC,P07IF9IF,O01JF0FFE,O07IFC1FFE,O0JFCIF8,N03JFBIF,N07NF,:N0OF,M01OF8003FFE,M01OFC003FFE,M01OFE003IF,:N0OFE003FFE,N07NFC001FFC,N03NFCI0FF8,N01NFC001FFC,O0NF8003FFE,O03MF800JF8,O01MF800JF8,P0MF800JF8,P07LFI0JF8,::P03LFI0JF8,P03KFEI0JF8,P01KF8I0JF8,Q0KFJ0JF8,Q0EJFJ0JF8,Q0E1IFCI0JF8,P07FC7FFEI0JF8,O01LFEI0JF8,O07MFI0JF8,O0NF800JF8,N03NFC00JF8,N07NFC00JF8,N0OFE007IF,M01OFE,M01PF,M03PF,M03IFE3KFL07,M03JF00IFE42I03E,M03JFE03FFEEKF8,M03KFC3FFCKFE,M03KFE3FFDKF8,M07KFC3FFBJFE,M07JFE03FF7JF8,M07JF801FEJFC,M07LF079IFE,M07KFE007IFM07C3F87C7F,M07KFCC0IFCM0E639CEE7F8,M07LFCJFCM0C330CEE718,M07LFDJFEL018330CFE718,M07QFEL01C330CE0618,M07QFEM0C739CE0618,M07QFCM0FE3F87E618,M03QF8M03C3F03C2,M03OFCFP03,M03OF9EP03P03C,M01OF1CP01O03FFCgJ01E,N0NFE38g07IFgJ03E,N07MF838Y01JF8gI03E,N03MF078Y03JF8gI03E,O0LF80Fg03F81F8gI03E,O03JFE03Fg07E007gJ03E,P0JF007Fg07CgM03E,O060FF001FEg0FCgM03E,O03CJ0FFEg0FCgM03E,O03FE01JFR0EI0EI0FCU038L0EI03E,O03NFEN0F07F807FC00FCK0F8003E01E1FFI0787FC003E07CI0F8,O03OFN0F1FFE0IF007CK0F8003E01E7FFC0079IF003E07C001F8,O07OFCM0F3FFE1IF007EK0F8003E03JFE00KF803E07E001F,O07MFCFEM0KF3IF803F8J0F8003E03KF00KFC03E03E001F,O07MF87FM0FF83FFC1F803FCJ0F8003E03FE03F80FF80FE03E03E003E,O07MF83F8L0FF01FF00FC01FF8I0F8003E03FC01F80FF007E03E03F003E,O07MF01FCL0FE00FF007C00FFEI0F8003E03F800FC0FE003E03E01F003E,O07LFE00FEL0FC00FE007C003FF800F8003E03FI07C0FC001F03E01F807C,O0MFC387EL0F800FC007CI0FFE00F8003E03FI07C0FC001F03E00F807C,N01MFC787FL0F800FC007CI03FF00F8003E03FI07C0FC001F03E00F807C,N01MF8703F8K0F800FC007CJ0FF80F8003E03EI03E0F8I0F03E007C0F8,N01MF0E01F8K0F800F8007CJ03F80F8003E03EI03E0F8I0F03E007C0F8,N01MF3C71FCK0F800F8007CK0FC0F8003E03EI03E0F8I0F03E007C1F,N03NFDF0FCK0FI0F8007CK07C0F8003E03EI03E0F8I0F03E003E1F,N03OFE0FCK0FI0F8007CK07C0F8003E03EI03E0F8I0F03E003E1E,N03OFE07EK0FI0F8007CK07E0F8007E03FI07C0FC001F03E001F3E,N07PFE7EK0FI0F8007CK07E0F8007E03FI07C0FC001F03E001F3E,I01CI07PFE7EK0FI0F8007CK07C0F8007E03FI07C0FC001F03EI0F7C,I03UFC7EK0FI0F8007C02I07C0FC00FE03F800FC0FE003F03EI0FFC,I03UFE7EK0FI0F8007C07800FC07C01FE03FC01F80FF007E03EI0FFC,I03UFE7FK0FI0F8007C0FE01F807E03FE03FE03F80FF80FE01FI07F8,I03UFE7FK0FI0F8007C0KF807JFE03FF8FF00FFE3FC01FC007F8,I07VF7FK0FI0F8007C07JF003IFBE03JFE00KF801FE003F,I07PF9MFK0FI0F8007C03IFE003IF3E03F7FFC00FDIFI0FE003F,I07PF8MFK0FI078007C00IF8001FFC3E03E3FF800F8FFEI07E003F,I07PF07LFW01FEJ03FJ03E0FCI0F83FK08003E,I07OFE03LFgP03EL0F8P03E,I07OFC01KFEgP03EL0F8P03C,I03OF801KFCgP03EL0F8P07C,I01OFI0KFCgP03EL0F8P07C,I01NFEI0KFCgP03EL0F8P0F8,I01NFCI07JF8gP03EL0F8N033F8,J0NF8I07JF8gP03EL0F8N07FF,J0NFJ07JF8gP03EL0F8N07FE,J0NFJ07JF8gP01EL078N07FC,J0MFEJ03JF87F8hK01E,J0MFEJ03MFE,J0MFCJ03MFE,J0FE003FFCJ03MFC,J0FCP07MF8,J0FCP07KF,J0FCP07JF8,J0F8P07IFE,I01FQ07IF8,I01EQ0IFE,I01CQ0IF8,I01CQ07FE,I018Q07F8,I018Q0FC,I01R04,,:::::::::::::^FS";

    // You can use an online image to ZPL convertor, such as the one at labelary.com/viewer.html, to convert the logo from an image to the ZPL code that the printer needs.

    format!(
        r#"
        ^XA
        ^FX CI command parameters:
        ^FX - encoding (28 = UTF-8)
        ^CI28
        ^FO18,18
        ^BXN,11,200
        ^FD{}^FS
        ^FO277,18^A0,32,25^FD{}^FS
        ^FO277,73^A0,32,25^FD{}^FS
        {}
        ^XZ"#,
        data.code, asset_number, date_printed, m_supply_logo
    )

    // # Instructions to output QR codes rather than data matrix barcodes:
    // In the payload variable above, there are these three lines of code:
    // ^FO18,18
    // ^BXN,11,200
    // ^FD{}^FS
    // Replace them with these three lines of code:
    // ^FO22,12
    // ^BQN,2,8
    // ^FDMA,{}^FS
    // For an explanation of how this works, see https://supportcommunity.zebra.com/s/article/ZPL-Command-Information-and-DetailsV2?language=en_US
    // To make the layout correct, adjust the positions of the elements (i.e. the values in the '^FO[number],[number]' statements) at labelary.com/viewer.html
}

pub fn print_asset_label(
    settings: LabelPrinterSettingNode,
    data: AssetLabelData,
) -> Result<String> {
    let payload = get_asset_label(data);
    let printer = Jetdirect::new(settings.address, settings.port);

    printer.send_string(payload, Mode::Print)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionLabelData {
    item_details: String, // usually the amount of units + the item name e.g. "10Tabs Paracetamol 500mg Tablets"
    item_directions: String,
    patient_details: String, // e.g patient name, possibly code etc.
    warning: Option<String>, // Some items come with a defined warning that should be printed on all labels regardless of directions e.g. avoid sun exposure, avoid alcohol...
    details: String, // General details to include e.g. store name, prescriber name, date/time...
}

impl PrescriptionLabelData {
    pub fn sanitise(&self) -> Self {
        Self {
            item_details: sanitise_fd_field(&self.item_details),
            item_directions: sanitise_fd_field(&self.item_directions),
            patient_details: sanitise_fd_field(&self.patient_details),
            warning: self.warning.as_ref().map(|w| sanitise_fd_field(w)),
            details: sanitise_fd_field(&self.details),
        }
    }
}

pub fn get_prescription_label(label_data: Vec<PrescriptionLabelData>) -> String {
    let sanitised_label_data: Vec<PrescriptionLabelData> =
        label_data.into_iter().map(|d| d.sanitise()).collect();

    sanitised_label_data
        .into_iter()
        .map(|d| {
            let PrescriptionLabelData {
                item_details,
                item_directions,
                patient_details,
                warning,
                details,
            } = d;
            let warning = warning.unwrap_or_default();

            let label = format!(
                r#"
                ^XA
                ^FX CI command parameters:
                ^FX - encoding (28 = UTF-8)
                ^CI28

                ^A0,25
                ^FO25,18
                ^FB575,3,0,C
                ^FD{item_details}^FS


                ^FX Line
                ^FO25,65
                ^GB575,2,2^FS

                ^A0,25
                ^FO35,75
                ^FB555,5,0
                ^FD{item_directions}\&{warning}^FS

                ^FX Line
                ^FO25,210
                ^GB575,2,2^FS

                ^A0,20
                ^FO25,220
                ^FB575,3,0,C
                ^FD{patient_details}\&{details}^FS

                ^XZ
            "#
            );

            // Remove leading whitespaces from each line of the formatted label
            label
                .lines()
                .map(|line| line.trim_start_matches(|c: char| c.is_whitespace()))
                .collect::<Vec<&str>>()
                .join("\n")
        })
        .collect::<Vec<String>>()
        .join("\n")
}

pub fn print_prescription_label(
    settings: LabelPrinterSettingNode,
    label_data: Vec<PrescriptionLabelData>,
) -> Result<String> {
    let payload = get_prescription_label(label_data);
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string(payload, Mode::Print)
}

pub fn host_status(settings: LabelPrinterSettingNode) -> Result<String> {
    let printer = Jetdirect::new(settings.address, settings.port);
    printer.send_string("~HS".to_string(), Mode::Sgd)
}

// Format a field for the FD command in ZPL
// https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/software/zpl-zbi2-pg-en.pdf
// Comments: The ^ and ~ characters can be printed by changing the prefix characters—see ^CD ~CD on
// page 153 and ^CT ~CT on page 166. The new prefix characters cannot be printed.
// We'll map them to a `-` so they can be printed as part of the field.
// Any character codes > 127 will be replaced with a space, as they are not valid in ZPL.
// ^CI13 must be selected to print a backslash (\).

fn sanitise_fd_field(value: &str) -> String {
    let mut fd: String = value
        .replace('^', "-") // Control characters are replaced with -
        .replace('~', "-") // Control characters are replaced with -
        .replace('\\', ":") // Backslashes `\` are replaced with colon `:` TODO: Probably could be an escaped Forward slash, e.g. \\\\ but apparently only works with CI13 or printed correctly using `FH` command ?
        .replace('\n', "\\&") // Newline characters are replaced with \& in ZPL
        .replace('\r', "\\&") // Carriage return characters are replaced with \&
        .chars()
        .map(|c| {
            if c.is_ascii() || c.is_alphabetic() {
                // Even though the ZPL manual says that only ASCII characters are allowed, some alphabetic chars such as á print fine, so I think safer to keep them
                c
            } else {
                ' '
            }
        }) // Non-ASCII characters are replaced with a space
        .collect();

    if fd.len() > 3072 {
        // TODO: Should we actually limit this more, as the label probably won't fit?
        // This is just the maximum length of a ZPL FD field.
        log::warn!(
            "ZPL FD field exceeds 3072 characters, truncating: {}",
            fd.len()
        );
    }
    fd.truncate(3072);
    fd
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitise_fd_field_replaces_control_chars() {
        let input = "^Hello~World\\";
        let expected = "-Hello-World:";
        assert_eq!(sanitise_fd_field(input), expected);
    }

    #[test]
    fn test_sanitise_fd_field_replaces_newlines_and_carriage_returns() {
        let input = "Line1\nLine2\rLine3";
        let expected = "Line1\\&Line2\\&Line3";
        assert_eq!(sanitise_fd_field(input), expected);
    }

    #[test]
    fn test_sanitise_fd_field_replaces_non_ascii() {
        let input = "ASCII é ñ 漢😀";
        let expected = "ASCII é ñ 漢 ";
        assert_eq!(sanitise_fd_field(input), expected);
    }

    #[test]
    fn test_sanitise_fd_field_preserves_dash() {
        let input = "A-B-C";
        let expected = "A-B-C";
        assert_eq!(sanitise_fd_field(input), expected);
    }

    #[test]
    fn test_sanitise_fd_field_truncates_long_input() {
        let input = "a".repeat(4000);
        let output = sanitise_fd_field(&input);
        assert_eq!(output.len(), 3072);
    }

    #[test]
    fn test_sanitise_fd_field_mixed_input() {
        let input = "^Hello~\nWorld\\é";
        let expected = "-Hello-\\&World:é";
        assert_eq!(sanitise_fd_field(input), expected);
    }

    #[test]
    fn test_sanitise_fd_field_empty_string() {
        let input = "";
        let expected = "";
        assert_eq!(sanitise_fd_field(input), expected);
    }

    #[test]
    fn test_sanitise_fd_field_only_control_chars() {
        let input = "^^~~\\\\\n\r";
        let expected = "----::\\&\\&";
        assert_eq!(sanitise_fd_field(input), expected);
    }
}
