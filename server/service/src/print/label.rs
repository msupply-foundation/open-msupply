use anyhow::Result;

use super::{
    jetdirect::{Jetdirect, Mode},
    Printer,
};

pub fn print_qr_code(printer: Printer, code: String, message: Option<String>) -> Result<()> {
    let formatted_message = match message {
        Some(msg) => {
            let mut y = 0;

            msg.split('\n')
                .map(|line| {
                    y = y + 50;
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
        ^FO50,50
        ^BQN,2,6
        ^FD,{}^FS        
        {}
        ^XZ"#,
        code, formatted_message
    );
    let printer = Jetdirect::new(printer.ip, printer.port);
    printer.send_string(payload, Mode::Print)
}
