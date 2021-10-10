use async_graphql::*;

pub mod delete;
pub use self::delete::*;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub struct InvoiceLineIsReserved;
#[Object]
impl InvoiceLineIsReserved {
    pub async fn description(&self) -> &'static str {
        "Invoice line is reserved"
    }
}

pub struct InvoiceLineBelongsToAnotherInvoice;
#[Object]
impl InvoiceLineBelongsToAnotherInvoice {
    pub async fn description(&self) -> &'static str {
        "Invoice line belongs to another invoice"
    }
}
