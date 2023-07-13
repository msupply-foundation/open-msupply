pub mod insert;
use repository::InvoiceRowType;

pub use self::insert::*;

pub mod update;
pub use self::update::*;

#[derive(Clone, Debug, PartialEq)]
pub enum StockOutType {
    OutboundShipment,
    Prescription,
}

impl StockOutType {
    pub fn to_domain(&self) -> InvoiceRowType {
        match self {
            StockOutType::OutboundShipment => InvoiceRowType::OutboundShipment,
            StockOutType::Prescription => InvoiceRowType::Prescription,
        }
    }
}
