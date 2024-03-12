use crate::{mock::mock_prescription_a, InvoiceLineRow, InvoiceLineRowType};

use chrono::NaiveDate;
use util::inline_init;

use super::{
    mock_inbound_return_a, mock_inbound_return_b, mock_item_a, mock_item_b, mock_item_b_lines,
    mock_outbound_return_a, mock_outbound_return_b, mock_stock_line_a, mock_stock_line_b,
    mock_stock_line_si_d,
};

pub fn mock_outbound_shipment_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_a_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_a_line_a"),
        invoice_id: String::from("outbound_shipment_a"),
        item_link_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 1).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 0.87,
        total_after_tax: 1.0,
        tax: Some(15.0),
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 10.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mock_outbound_shipment_a_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_a_line_b"),
        invoice_id: String::from("outbound_shipment_a"),
        item_link_id: String::from("item_b"),
        location_id: None,
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 2).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 1.74,
        total_after_tax: 2.0,
        tax: Some(15.0),
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 4.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![
        mock_outbound_shipment_a_invoice_line_a,
        mock_outbound_shipment_a_invoice_line_b,
    ]
}

pub fn mock_outbound_shipment_b_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_b_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_b_line_a"),
        invoice_id: String::from("outbound_shipment_b"),
        item_link_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 3).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 3.0,
        total_after_tax: 3.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 3.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mock_outbound_shipment_b_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_b_line_b"),
        invoice_id: String::from("outbound_shipment_b"),
        item_link_id: String::from("item_b"),
        item_name: String::from("Item B"),
        location_id: None,
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 4).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 4.0,
        total_after_tax: 4.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 5.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![
        mock_outbound_shipment_b_invoice_line_a,
        mock_outbound_shipment_b_invoice_line_b,
    ]
}

pub fn mock_outbound_shipment_c_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_c_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_c_line_a"),
        invoice_id: String::from("outbound_shipment_c"),
        item_link_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("stock_line_ci_c_siline_a")),
        batch: Some(String::from("item_a_ci_c_siline_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 1, 4).unwrap()),
        pack_size: 3,
        cost_price_per_pack: 8.0,
        sell_price_per_pack: 9.0,
        total_before_tax: 27.0,
        total_after_tax: 27.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 3.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mock_outbound_shipment_c_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_c_line_b"),
        invoice_id: String::from("outbound_shipment_c"),
        location_id: None,
        item_link_id: String::from("item_b"),
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("stock_line_ci_c_siline_b")),
        batch: None,
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 3, 23).unwrap()),
        pack_size: 7,
        cost_price_per_pack: 54.0,
        sell_price_per_pack: 34.0,
        total_before_tax: 34.0,
        total_after_tax: 34.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 1.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![
        mock_outbound_shipment_c_invoice_line_a,
        mock_outbound_shipment_c_invoice_line_b,
    ]
}

pub fn mock_outbound_shipment_d_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_d_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_d_line_a"),
        invoice_id: String::from("outbound_shipment_d"),
        item_link_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("stock_line_ci_d_siline_a")),
        batch: Some(String::from("stock_line_ci_d_siline_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 1, 4).unwrap()),
        pack_size: 2,
        cost_price_per_pack: 10.0,
        sell_price_per_pack: 11.0,
        total_before_tax: 22.0,
        total_after_tax: 22.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 2.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![mock_outbound_shipment_d_invoice_line_a]
}

pub fn mock_outbound_shipment_no_stock_line() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_no_stock_line: InvoiceLineRow = InvoiceLineRow {
        id: String::from("mock_outbound_shipment_no_stock_line"),
        invoice_id: String::from("mock_new_outbound_shipment_no_stockline"),
        item_link_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: None,
        batch: None,
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 1, 4).unwrap()),
        pack_size: 2,
        cost_price_per_pack: 10.0,
        sell_price_per_pack: 11.0,
        total_before_tax: 22.0,
        total_after_tax: 22.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 2.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![mock_outbound_shipment_no_stock_line]
}

pub fn mock_inbound_shipment_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_shipment_a_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_a_line_a"),
        invoice_id: String::from("inbound_shipment_a"),
        item_link_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 5).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 5.0,
        total_after_tax: 5.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 1.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mock_inbound_shipment_a_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_a_line_b"),
        invoice_id: String::from("inbound_shipment_a"),
        item_link_id: String::from("item_b"),
        location_id: None,
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 6).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 6.0,
        total_after_tax: 6.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 1.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![
        mock_inbound_shipment_a_invoice_line_a,
        mock_inbound_shipment_a_invoice_line_b,
    ]
}

pub fn mock_inbound_shipment_b_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_shipment_b_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_b_line_a"),
        invoice_id: String::from("inbound_shipment_b"),
        item_link_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 7).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 7.0,
        total_after_tax: 7.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 1.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mock_inbound_shipment_b_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_b_line_b"),
        invoice_id: String::from("inbound_shipment_b"),
        item_link_id: String::from("item_b"),
        location_id: None,
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 8).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 8.0,
        total_after_tax: 8.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 1.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![
        mock_inbound_shipment_b_invoice_line_a,
        mock_inbound_shipment_b_invoice_line_b,
    ]
}

pub fn mock_inbound_shipment_c_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_shipment_c_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_c_line_a"),
        invoice_id: String::from("inbound_shipment_c"),
        item_link_id: String::from("item_a"),
        location_id: Some("location_1".to_owned()),
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: None,
        batch: Some(String::from("item_a_si_c_siline_a")),
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 7.0,
        sell_price_per_pack: 5.0,
        total_before_tax: 21.0,
        total_after_tax: 21.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 3.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mock_inbound_shipment_c_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_c_line_b"),
        invoice_id: String::from("inbound_shipment_c"),
        item_link_id: String::from("item_b"),
        location_id: None,
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: None,
        batch: Some(String::from("item_b_si_c_siline_b")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 8).unwrap()),
        pack_size: 1,
        cost_price_per_pack: 4.0,
        sell_price_per_pack: 2.0,
        total_before_tax: 8.0,
        total_after_tax: 8.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 2.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mock_inbound_shipment_c_invoice_line_c: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_c_line_c"),
        invoice_id: String::from("inbound_shipment_c"),
        item_link_id: String::from("item_g"),
        location_id: None,
        item_name: String::from("item_g"),
        item_code: String::from("item_g"),
        stock_line_id: None,
        batch: Some(String::from("item_g_si_c_siline_g")),
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 4.0,
        sell_price_per_pack: 2.0,
        total_before_tax: 8.0,
        total_after_tax: 8.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 2.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![
        mock_inbound_shipment_c_invoice_line_a,
        mock_inbound_shipment_c_invoice_line_b,
        mock_inbound_shipment_c_invoice_line_c,
    ]
}

pub fn mock_inbound_shipment_d_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_shipment_d_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_d_line_a"),
        invoice_id: String::from("inbound_shipment_d"),
        item_link_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("stock_line_si_d_siline_a")),
        batch: Some(String::from("item_a_si_d_siline_a")),
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 2.0,
        sell_price_per_pack: 18.0,
        total_before_tax: 14.0,
        total_after_tax: 14.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 7.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mock_inbound_shipment_d_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_d_line_b"),
        invoice_id: String::from("inbound_shipment_d"),
        item_link_id: String::from("item_b"),
        location_id: Some("location_1".to_owned()),
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("stock_line_si_d_siline_b")),
        batch: Some(String::from("item_b_si_c_siline_d")),
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 11).unwrap()),
        pack_size: 3,
        cost_price_per_pack: 45.0,
        sell_price_per_pack: 34.0,
        total_before_tax: 270.0,
        total_after_tax: 270.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 2.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    vec![
        mock_inbound_shipment_d_invoice_line_a,
        mock_inbound_shipment_d_invoice_line_b,
    ]
}

pub fn mock_prescription_a_invoice_line_a() -> InvoiceLineRow {
    inline_init(|l: &mut InvoiceLineRow| {
        l.id = "prescription_a_invoice_line_a".to_string();
        l.invoice_id = mock_prescription_a().id;
        l.item_link_id = "item_a".to_string();
        l.item_code = "item_a_code".to_string();
        l.item_name = "Item A".to_string();
        l.stock_line_id = Some(mock_stock_line_si_d()[0].id.clone());
        l.batch = mock_stock_line_si_d()[0].batch.clone();
        l.pack_size = 1;
        l.cost_price_per_pack = 2.0;
        l.sell_price_per_pack = 18.0;
        l.number_of_packs = 5.0;
        l.total_before_tax = 10.0;
        l.total_after_tax = 10.0;
        l.r#type = InvoiceLineRowType::StockOut
    })
}

pub fn mock_prescription_a_invoice_line_b() -> InvoiceLineRow {
    inline_init(|l: &mut InvoiceLineRow| {
        l.id = "prescription_a_invoice_line_b".to_string();
        l.invoice_id = mock_prescription_a().id;
        l.item_link_id = "item_b".to_string();
        l.item_code = "item_b_code".to_string();
        l.stock_line_id = Some("stock_line_si_d_siline_b".to_string());
        l.pack_size = 1;
        l.cost_price_per_pack = 3.0;
        l.sell_price_per_pack = 5.0;
        l.number_of_packs = 10.0;
        l.total_before_tax = 50.0;
        l.total_after_tax = 50.0;
        l.r#type = InvoiceLineRowType::StockOut
    })
}

pub fn mock_outbound_return_a_invoice_line_a() -> InvoiceLineRow {
    inline_init(|l: &mut InvoiceLineRow| {
        l.id = "outbound_return_a_invoice_line_a".to_string();
        l.invoice_id = mock_outbound_return_a().id;
        l.item_link_id = "item_b".to_string();
        l.stock_line_id = Some(mock_stock_line_a().id);
        l.item_code = "item_b_code".to_string();
        l.note = Some("return_comment".to_string());
        l.number_of_packs = 4.0;
        l.r#type = InvoiceLineRowType::StockOut
    })
}
pub fn mock_outbound_return_a_invoice_line_b() -> InvoiceLineRow {
    inline_init(|l: &mut InvoiceLineRow| {
        l.id = "outbound_return_a_invoice_line_b".to_string();
        l.invoice_id = mock_outbound_return_a().id;
        l.item_link_id = "item_b".to_string();
        l.stock_line_id = Some(mock_stock_line_b().id);
        l.item_code = "item_b_code".to_string();
        l.note = Some("return_comment".to_string());
        l.r#type = InvoiceLineRowType::StockOut
    })
}
pub fn mock_outbound_return_b_invoice_line_a() -> InvoiceLineRow {
    inline_init(|l: &mut InvoiceLineRow| {
        l.id = "outbound_return_b_invoice_line_a".to_string();
        l.invoice_id = mock_outbound_return_b().id;
        l.item_link_id = "item_b".to_string();
        l.stock_line_id = Some(mock_stock_line_a().id);
        l.item_code = "item_b_code".to_string();
        l.note = Some("return_comment".to_string());
        l.number_of_packs = 5.0;
        l.r#type = InvoiceLineRowType::StockOut
    })
}

pub fn mock_inbound_return_a_invoice_line_a() -> InvoiceLineRow {
    inline_init(|l: &mut InvoiceLineRow| {
        l.id = "inbound_return_a_invoice_line_a".to_string();
        l.invoice_id = mock_inbound_return_a().id;
        l.item_link_id = mock_item_a().id;
        l.item_code = mock_item_a().code;
        l.stock_line_id = Some(mock_stock_line_a().id);
        l.note = Some("return_comment_line_a".to_string());
        l.r#type = InvoiceLineRowType::StockIn
    })
}

pub fn mock_inbound_return_a_invoice_line_b() -> InvoiceLineRow {
    inline_init(|l: &mut InvoiceLineRow| {
        l.id = "inbound_return_a_invoice_line_b".to_string();
        l.invoice_id = mock_inbound_return_a().id;
        l.item_link_id = mock_item_b().id;
        l.item_code = mock_item_b().code;
        l.stock_line_id = Some(mock_item_b_lines()[0].id.clone());
        l.note = Some("return_comment_line_b".to_string());
        l.r#type = InvoiceLineRowType::StockIn
    })
}

pub fn mock_inbound_return_b_invoice_line_a() -> InvoiceLineRow {
    inline_init(|l: &mut InvoiceLineRow| {
        l.id = "inbound_return_b_invoice_line_a".to_string();
        l.invoice_id = mock_inbound_return_b().id;
        l.item_link_id = mock_item_a().id;
        l.item_code = mock_item_a().code;
        l.note = Some("return_comment_line_a".to_string());
        l.number_of_packs = 5.0;
        l.batch = Some("test_batch".to_string());
        l.r#type = InvoiceLineRowType::StockIn
    })
}

pub fn mock_outbound_return_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_return_a_invoice_line_a = mock_outbound_return_a_invoice_line_a();
    let mock_outbound_return_a_invoice_line_b = mock_outbound_return_a_invoice_line_b();

    vec![
        mock_outbound_return_a_invoice_line_a,
        mock_outbound_return_a_invoice_line_b,
    ]
}

pub fn mock_outbound_return_b_invoice_lines() -> Vec<InvoiceLineRow> {
    vec![mock_outbound_return_b_invoice_line_a()]
}

pub fn mock_inbound_return_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_return_a_invoice_line_a = mock_inbound_return_a_invoice_line_a();
    let mock_inbound_return_a_invoice_line_b = mock_inbound_return_a_invoice_line_b();

    vec![
        mock_inbound_return_a_invoice_line_a,
        mock_inbound_return_a_invoice_line_b,
    ]
}

pub fn mock_inbound_return_b_invoice_lines() -> Vec<InvoiceLineRow> {
    vec![mock_inbound_return_b_invoice_line_a()]
}

pub fn mock_prescription_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_prescription_a_invoice_line_a = mock_prescription_a_invoice_line_a();
    let mock_prescription_a_invoice_line_b = mock_prescription_a_invoice_line_b();

    vec![
        mock_prescription_a_invoice_line_a,
        mock_prescription_a_invoice_line_b,
    ]
}

pub fn mock_outbound_shipment_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_outbound_shipment_invoice_lines = Vec::new();

    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_a_invoice_lines());
    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_b_invoice_lines());
    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_c_invoice_lines());
    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_d_invoice_lines());
    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_no_stock_line());
    mock_outbound_shipment_invoice_lines
}

pub fn mock_inbound_shipment_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_inbound_shipment_invoice_lines = Vec::new();

    mock_inbound_shipment_invoice_lines.extend(mock_inbound_shipment_a_invoice_lines());
    mock_inbound_shipment_invoice_lines.extend(mock_inbound_shipment_b_invoice_lines());
    mock_inbound_shipment_invoice_lines.extend(mock_inbound_shipment_c_invoice_lines());
    mock_inbound_shipment_invoice_lines.extend(mock_inbound_shipment_d_invoice_lines());
    mock_inbound_shipment_invoice_lines
}

pub fn mock_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_invoice_lines: Vec<InvoiceLineRow> = Vec::new();

    mock_invoice_lines.extend(mock_outbound_shipment_invoice_lines());
    mock_invoice_lines.extend(mock_inbound_shipment_invoice_lines());
    mock_invoice_lines.extend(mock_prescription_a_invoice_lines());
    mock_invoice_lines.extend(mock_outbound_return_a_invoice_lines());
    mock_invoice_lines.extend(mock_outbound_return_b_invoice_lines());
    mock_invoice_lines.extend(mock_inbound_return_a_invoice_lines());
    mock_invoice_lines.extend(mock_inbound_return_b_invoice_lines());

    mock_invoice_lines
}
