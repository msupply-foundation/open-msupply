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
