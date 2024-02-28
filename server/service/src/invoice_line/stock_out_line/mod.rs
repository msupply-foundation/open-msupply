use repository::InvoiceRowType;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub mod delete;
pub use self::delete::*;

pub mod validate;
pub use self::validate::*;

#[derive(Clone, Debug, PartialEq)]
pub enum StockOutType {
    OutboundShipment,
    OutboundReturn,
    Prescription,
}

impl StockOutType {
    pub fn to_domain(&self) -> InvoiceRowType {
        match self {
            StockOutType::OutboundShipment => InvoiceRowType::OutboundShipment,
            StockOutType::Prescription => InvoiceRowType::Prescription,
            StockOutType::OutboundReturn => InvoiceRowType::OutboundReturn,
        }
    }
}
