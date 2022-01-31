mod invoice;
mod invoice_line;
mod invoice_line_query;
mod item;
mod loader_registry;
mod location;
mod master_list_line;
mod name;
mod requisition;
mod requisition_line;
mod stock_line;
mod stock_take_lines;
mod store;
mod user_account;

use std::collections::HashSet;

pub use invoice::*;
pub use invoice_line::InvoiceLineLoader;
pub use invoice_line_query::*;
pub use item::ItemLoader;
pub use loader_registry::{get_loaders, LoaderMap, LoaderRegistry};
pub use location::LocationByIdLoader;
pub use master_list_line::MasterListLineByMasterListId;
pub use name::NameByIdLoader;
pub use requisition::*;
pub use requisition_line::*;
pub use stock_line::{StockLineByIdLoader, StockLineByItemIdLoader, StockLineByLocationIdLoader};
pub use stock_take_lines::StockTakeLineByStockTakeIdLoader;
pub use store::StoreLoader;
pub use user_account::UserAccountLoader;

#[derive(Hash, Clone, PartialEq, Eq)]
pub struct RequisitionAndItemId {
    pub requisition_id: String,
    pub item_id: String,
}

fn extract_unique_requisition_and_item_id(
    requisition_and_item_ids: &[RequisitionAndItemId],
) -> (Vec<String>, Vec<String>) {
    let mut requisition_ids: HashSet<String> = HashSet::new();
    let mut item_ids: HashSet<String> = HashSet::new();

    for RequisitionAndItemId {
        requisition_id,
        item_id,
    } in requisition_and_item_ids
    {
        requisition_ids.insert(requisition_id.clone());
        item_ids.insert(item_id.clone());
    }

    (
        requisition_ids.into_iter().collect(),
        item_ids.into_iter().collect(),
    )
}
