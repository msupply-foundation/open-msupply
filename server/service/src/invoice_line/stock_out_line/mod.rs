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
    OutboundReturn,
    Prescription,
    InventoryReduction,
}

impl StockOutType {
    pub fn to_domain(&self) -> InvoiceType {
        match self {
            StockOutType::OutboundShipment => InvoiceType::OutboundShipment,
            StockOutType::Prescription => InvoiceType::Prescription,
            StockOutType::OutboundReturn => InvoiceType::OutboundReturn,
            StockOutType::InventoryReduction => InvoiceType::InventoryReduction,
        }
    }
}
