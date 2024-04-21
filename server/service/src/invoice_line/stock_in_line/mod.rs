use repository::InvoiceType;

pub mod delete;
pub mod insert;
pub mod update;
pub use self::delete::*;
pub use self::insert::*;
pub use self::update::*;

#[derive(Clone, Debug, Default, PartialEq)]
pub enum StockInType {
    #[default]
    InboundReturn,
}

impl StockInType {
    pub fn to_domain(&self) -> InvoiceType {
        match self {
            StockInType::InboundReturn => InvoiceType::InboundReturn,
        }
    }
}
