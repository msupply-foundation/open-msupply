use crate::database::repository::StorageConnectionManager;
use crate::server::service::graphql::schema::types::InvoiceLineResponse;
use crate::server::service::graphql::ContextExt;
use crate::service::invoice_line::get_invoice_line;
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
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        get_invoice_line(connection_manager, self.0.clone()).into()
    }
}

pub struct LineDoesntReferenceStockLine;
#[Object]
impl LineDoesntReferenceStockLine {
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
