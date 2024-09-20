use qrcode::bits::encode_auto;
use qrcode::render::svg;
use qrcode::{EcLevel, QrCode};

pub fn qr_code_as_html_img_src(data: &str) -> String {
    let bits = encode_auto(data.as_bytes(), EcLevel::L).unwrap();
    let code = QrCode::with_bits(bits, EcLevel::L).unwrap();
    let image = code
        .render()
        .min_dimensions(100, 100)
        .dark_color(svg::Color("#000000"))
        .light_color(svg::Color("#ffffff"))
        .build();

    format!("{}", image)
}

// pub fn generate_qr_code(data: &str) -> Vec<u8> {
//     let code = QrCode::new(data.as_bytes()).unwrap();
//     let image = code.render::<Luma<u8>>().build();
//     let mut buf = vec![];
//     {
//         let mut cursor = Cursor::new(&mut buf);
//         let result = image.write_to(&mut cursor, image::ImageFormat::Png);

//         if let Err(e) = result {
//             log::error!("Failed to write QR code to buffer: {}", e);
//         }
//     }
//     buf
// }

// pub fn qr_code_as_base64(data: &str) -> String {
//     let qr_code = generate_qr_code(data);
//     STANDARD.encode(&qr_code)
// }

// pub fn qr_code_as_html_img_src(data: &str) -> String {
//     let base64 = qr_code_as_base64(data);
//     format!("data:image/png;base64,{}", base64)
// }
