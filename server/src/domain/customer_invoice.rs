use super::invoice::InvoiceStatus;

pub struct InsertCustomerInvoice {
    pub id: String,
    pub other_party_id: String,
    pub status: InvoiceStatus,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

pub struct UpdateCustomerInvoice {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<InvoiceStatus>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

pub struct InsertCustomerInvoiceLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
}

pub struct UpdateCustomerInvoiceLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub stock_line_id: Option<String>,
    pub number_of_packs: Option<u32>,
}

pub struct DeleteCustomerInvoiceLine {
    pub id: String,
    pub invoice_id: String,
}
