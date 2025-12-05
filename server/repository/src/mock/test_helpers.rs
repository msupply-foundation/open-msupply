use chrono::{Duration, NaiveDateTime};
use util::datetime_now;

use crate::{
    mock::{mock_name_a, MockData},
    InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, StockLineRow,
};

pub fn make_movements(stock_line: StockLineRow, date_quantity: Vec<(i64, i64)>) -> MockData {
    make_movements_extended(MakeMovements {
        stock_line,
        date_quantity,
        reference_datetime: datetime_now(),
        offset_days: 30,
    })
}

pub struct MakeMovements {
    pub stock_line: StockLineRow,
    pub date_quantity: Vec<(i64, i64)>,
    pub reference_datetime: NaiveDateTime,
    pub offset_days: i64,
}

pub fn make_movements_extended(
    MakeMovements {
        stock_line,
        date_quantity,
        reference_datetime,
        offset_days,
    }: MakeMovements,
) -> MockData {
    let (invoices, invoice_lines) = date_quantity
        .into_iter()
        .map(|(date, quantity)| {
            let invoice_id = format!("invoice_{}_{}_{}", stock_line.id, date, quantity);
            let date = reference_datetime - Duration::days(offset_days - date);
            (
                InvoiceRow {
                    id: invoice_id.clone(),
                    store_id: stock_line.store_id.clone(),
                    name_link_id: mock_name_a().id.clone(),
                    r#type: if quantity > 0 {
                        InvoiceType::InboundShipment
                    } else {
                        InvoiceType::OutboundShipment
                    },
                    status: if quantity > 0 {
                        InvoiceStatus::Verified
                    } else {
                        InvoiceStatus::Shipped
                    },
                    created_datetime: date,
                    allocated_datetime: Some(date),
                    picked_datetime: Some(date),
                    shipped_datetime: Some(date),
                    delivered_datetime: Some(date),
                    received_datetime: Some(date),
                    verified_datetime: Some(date),
                    ..Default::default()
                },
                InvoiceLineRow {
                    id: format!("line_{invoice_id}"),
                    invoice_id,
                    item_link_id: stock_line.item_link_id.clone(),
                    stock_line_id: Some(stock_line.id.clone()),
                    pack_size: stock_line.pack_size,
                    number_of_packs: quantity.abs() as f64,
                    r#type: if quantity > 0 {
                        use InvoiceLineType;

                        InvoiceLineType::StockIn
                    } else {
                        InvoiceLineType::StockOut
                    },
                    ..Default::default()
                },
            )
        })
        .unzip();

    MockData {
        invoices,
        invoice_lines,
        ..Default::default()
    }
}
