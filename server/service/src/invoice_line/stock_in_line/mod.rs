use repository::InvoiceRowType;

pub mod insert;

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
