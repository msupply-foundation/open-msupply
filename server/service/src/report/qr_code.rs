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
