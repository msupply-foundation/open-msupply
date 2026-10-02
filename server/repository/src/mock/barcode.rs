use crate::BarcodeRow;

pub fn barcode_a() -> BarcodeRow {
    BarcodeRow {
        id: String::from("barcode_a"),
        value: String::from("plain:0123456789"),
        item_id: String::from("item_a"),
        pack_size: Some(1.0),
        deleted_datetime: None,
        manufacturer_id: Some(String::from("manufacturer_a")),
    }
}

pub fn barcode_b() -> BarcodeRow {
    BarcodeRow {
        id: String::from("barcode_b"),
        value: String::from("plain:9876543210"),
        item_id: String::from("item_b"),
        pack_size: Some(1.0),
        deleted_datetime: None,
        manufacturer_id: Some(String::from("manufacturer_a")),
    }
}

pub fn mock_barcodes() -> Vec<BarcodeRow> {
    vec![barcode_a(), barcode_b()]
}
