use domain::invoice_line::{InvoiceLine, InvoiceLineType};

mod delete;
mod insert;
mod update;

pub fn successfull_invoice_line() -> InvoiceLine {
    InvoiceLine {
        id: "test_id".to_owned(),
        invoice_id: "invoice_id".to_owned(),
        item_id: "item_id".to_owned(),
        item_name: "item_name".to_owned(),
        item_code: "item_code".to_owned(),
        r#type: InvoiceLineType::UnallocatedStock,
        pack_size: 1,
        number_of_packs: 2,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        batch: None,
        expiry_date: None,
        note: None,
        stock_line_id: None,
        location_id: None,
        location_name: None,
    }
}
