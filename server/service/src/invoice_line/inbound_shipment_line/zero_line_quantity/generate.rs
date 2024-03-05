use repository::{InvoiceLineRow, InvoiceRow};

pub struct GenerateResult {
    pub invoice_row: InvoiceRow,
    pub new_line: InvoiceLineRow,
    pub stock_line_id: Option<String>,
}

pub fn generate(
    user_id: &str,
    existing_invoice_row: InvoiceRow,
    existing_invoice_line: InvoiceLineRow,
) -> GenerateResult {
    let new_line = generate_line(existing_invoice_line.clone());

    let invoice_row = InvoiceRow {
        user_id: if existing_invoice_row.user_id != Some(user_id.to_string()) {
            Some(user_id.to_string())
        } else {
            existing_invoice_row.user_id
        },
        ..existing_invoice_row
    };

    GenerateResult {
        invoice_row,
        new_line,
        stock_line_id: existing_invoice_line.stock_line_id,
    }
}

fn generate_line(line: InvoiceLineRow) -> InvoiceLineRow {
    InvoiceLineRow {
        location_id: None,
        pack_size: 0,
        batch: None,
        expiry_date: None,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        number_of_packs: 0.0,
        stock_line_id: None,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax: None,
        note: None,
        inventory_adjustment_reason_id: None,
        ..line
    }
}
