use repository::InvoiceRowType;

pub mod insert;
pub use self::insert::*;
pub mod update;
pub use self::update::*;

#[derive(Clone, Debug, Default, PartialEq)]
pub enum StockInType {
    #[default]
    InboundReturn,
}

impl StockInType {
    pub fn to_domain(&self) -> InvoiceRowType {
        match self {
            StockInType::InboundReturn => InvoiceRowType::InboundReturn,
        }
    }
}
