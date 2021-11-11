use chrono::NaiveDate;

use super::invoice::InvoiceStatus;

pub struct InsertInboundShipment {
    pub id: String,
    pub other_party_id: String,
    pub status: InvoiceStatus,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub color: Option<String>,
}

pub struct UpdateInboundShipment {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<InvoiceStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub color: Option<String>,
}
pub struct DeleteInboundShipment {
    pub id: String,
}

pub struct InsertInboundShipmentLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub pack_size: u32,
    pub batch: Option<String>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: u32,
}

pub struct UpdateInboundShipmentLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub pack_size: Option<u32>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<u32>,
}

pub struct DeleteInboundShipmentLine {
    pub id: String,
    pub invoice_id: String,
}
