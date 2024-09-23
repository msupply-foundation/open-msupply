use chrono::NaiveDateTime;
use repository::InvoiceRow;
use repository::InvoiceType;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub mod delete;
pub use self::delete::*;

pub mod validate;
pub use self::validate::*;

#[derive(Clone, Debug, Default, PartialEq)]
pub enum StockOutType {
    #[default]
    OutboundShipment,
    SupplierReturn,
    Prescription,
    InventoryReduction,
}

impl StockOutType {
    pub fn to_domain(&self) -> InvoiceType {
        match self {
            StockOutType::OutboundShipment => InvoiceType::OutboundShipment,
            StockOutType::Prescription => InvoiceType::Prescription,
            StockOutType::SupplierReturn => InvoiceType::SupplierReturn,
            StockOutType::InventoryReduction => InvoiceType::InventoryReduction,
        }
    }
}

pub(crate) fn invoice_backdated_date(invoice: &InvoiceRow) -> Option<NaiveDateTime> {
    if let Some(allocated_date) = invoice.allocated_datetime.clone() {
        if allocated_date < chrono::Utc::now().naive_utc() - chrono::Duration::hours(24) {
            return Some(allocated_date);
        }
    }
    None
}
