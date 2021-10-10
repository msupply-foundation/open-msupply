use super::invoice::InvoiceStatus;

pub struct InsertSupplierInvoice {
    pub id: String,
    pub other_party_id: String,
    pub status: InvoiceStatus,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}
