#[cfg_attr(feature = "mock", path = "mock.rs")]
#[cfg_attr(not(feature = "mock"), path = "diesel.rs")]
mod loader;

mod invoice;
mod invoice_line;
mod invoice_line_query;
mod item;
mod name;
mod requisition;
mod requisition_line;
mod stock_line;
mod store;
mod user_account;

pub use invoice::InvoiceLoader;
pub use invoice_line::{InvoiceLineLoader, InvoiceLineStatsLoader};
pub use invoice_line_query::InvoiceLineQueryLoader;
pub use item::ItemLoader;
pub use loader::get_loaders;
pub use name::NameLoader;
pub use requisition::RequisitionLoader;
pub use requisition_line::RequisitionLineLoader;
pub use stock_line::{StockLineByIdLoader, StockLineByItemIdLoader};
pub use store::StoreLoader;
pub use user_account::UserAccountLoader;
