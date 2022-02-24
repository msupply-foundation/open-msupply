use repository::{
    mock::{mock_outbound_shipment_a, mock_outbound_shipment_a_invoice_lines},
    InvoiceLine,
};

mod delete;
mod insert;
mod update;

pub fn successfull_invoice_line() -> InvoiceLine {
    InvoiceLine {
        invoice_line_row: mock_outbound_shipment_a_invoice_lines()[0].clone(),
        invoice_row: mock_outbound_shipment_a(),
        location_row_option: None,
    }
}
