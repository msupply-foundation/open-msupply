use async_graphql::*;

pub mod delete;
use crate::database::repository::StorageConnectionManager;
use crate::server::service::graphql::schema::types::get_invoice_response;
use crate::server::service::graphql::schema::types::InvoiceResponse;
use crate::server::service::graphql::ContextExt;

pub use self::delete::*;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub struct BatchIsReserved;
#[Object]
impl BatchIsReserved {
    pub async fn description(&self) -> &'static str {
        "Batch is already reserved/issued"
    }
}

pub struct InvoiceLineBelongsToAnotherInvoice(String);
#[Object]
impl InvoiceLineBelongsToAnotherInvoice {
    pub async fn description(&self) -> &'static str {
        "Invoice line belongs to another invoice"
    }

    pub async fn invoice(&self, ctx: &Context<'_>) -> InvoiceResponse {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        get_invoice_response(connection_manager, self.0.clone())
    }
}
