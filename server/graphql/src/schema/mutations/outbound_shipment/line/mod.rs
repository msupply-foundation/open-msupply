use crate::schema::types::{
    get_invoice_line_response, get_stock_line_response, InvoiceLineResponse, StockLineResponse,
};
use crate::ContextExt;
use async_graphql::*;

pub mod delete;
pub use self::delete::*;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub struct StockLineDoesNotBelongToCurrentStore;
#[Object]
impl StockLineDoesNotBelongToCurrentStore {
    pub async fn description(&self) -> &'static str {
        "Stock line does not belong to current store"
    }
}

pub struct StockLineAlreadyExistsInInvoice(pub String);
#[Object]
impl StockLineAlreadyExistsInInvoice {
    pub async fn description(&self) -> &'static str {
        "Stock line is already reference by an invoice line of this invoice"
    }

    pub async fn line(&self, ctx: &Context<'_>) -> InvoiceLineResponse {
        let connection_manager = ctx.get_connection_manager();

        get_invoice_line_response(connection_manager, self.0.clone())
    }
}

pub struct StockLineIsOnHold;
#[Object]
impl StockLineIsOnHold {
    pub async fn description(&self) -> &'static str {
        "Cannot issue from stock line that is on hold"
    }
}

pub struct LocationIsOnHold;
#[Object]
impl LocationIsOnHold {
    pub async fn description(&self) -> &'static str {
        "Cannot issue from on hold location"
    }
}

pub struct NotEnoughStockForReduction {
    pub stock_line_id: String,
    pub line_id: Option<String>,
}

#[Object]
impl NotEnoughStockForReduction {
    pub async fn description(&self) -> &'static str {
        "Not enought stock for reduction"
    }

    pub async fn line(&self, ctx: &Context<'_>) -> Option<InvoiceLineResponse> {
        let connection_manager = ctx.get_connection_manager();

        self.line_id
            .as_ref()
            .map(|line_id| get_invoice_line_response(connection_manager, line_id.clone()))
    }

    pub async fn batch(&self, ctx: &Context<'_>) -> StockLineResponse {
        let connection_manager = ctx.get_connection_manager();

        get_stock_line_response(connection_manager, self.stock_line_id.clone())
    }
}

pub struct LineDoesNotReferenceStockLine;
#[Object]
impl LineDoesNotReferenceStockLine {
    pub async fn description(&self) -> &'static str {
        "Internal Error, line does not reference stock line"
    }
}

pub struct ItemDoesNotMatchStockLine;
#[Object]
impl ItemDoesNotMatchStockLine {
    pub async fn description(&self) -> &'static str {
        "Item does not match stock line"
    }
}
