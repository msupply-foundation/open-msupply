use repository::InvoiceType;

pub mod generate;
pub mod validate;

pub mod delete;
pub mod insert;
pub mod update;
pub use self::delete::*;
pub use self::insert::*;
pub use self::update::*;

pub use self::generate::*;
pub use self::validate::*;

#[derive(Clone, Debug, Default, PartialEq)]
pub enum StockInType {
    #[default]
    InboundReturn,
    InventoryAddition,
    InboundShipment,
}

impl StockInType {
    pub fn to_domain(&self) -> InvoiceType {
        match self {
            StockInType::InboundReturn => InvoiceType::InboundReturn,
            StockInType::InventoryAddition => InvoiceType::InventoryAddition,
            StockInType::InboundShipment => InvoiceType::InboundShipment,
        }
    }
}
