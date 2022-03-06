mod invoice;
mod invoice_line;
mod item;
mod item_stats;
mod loader_registry;
mod location;
mod master_list_line;
mod name;
mod requisition;
mod requisition_line;
mod stock_line;
mod stocktake_lines;
mod store;
mod user_account;

use std::{collections::HashSet, hash::Hasher};

use chrono::NaiveDateTime;
pub use invoice::*;
pub use invoice_line::*;
pub use item::ItemLoader;
pub use item_stats::*;
pub use loader_registry::{get_loaders, LoaderMap, LoaderRegistry};
pub use location::LocationByIdLoader;
pub use master_list_line::MasterListLineByMasterListId;
pub use name::NameByIdLoader;
pub use requisition::*;
pub use requisition_line::*;
pub use stock_line::*;
pub use stocktake_lines::*;
pub use store::StoreLoader;
pub use user_account::UserAccountLoader;

#[derive(Hash, Debug, Clone, PartialEq, Eq)]
pub struct RequisitionAndItemId {
    pub requisition_id: String,
    pub item_id: String,
}

fn extract_unique_requisition_and_item_ids(
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IdAndStoreId {
    pub id: String,
    pub store_id: String,
}

impl std::hash::Hash for IdAndStoreId {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ItemStatsLoaderInput {
    pub item_id: String,
    pub store_id: String,
    pub look_back_datetime: Option<NaiveDateTime>,
}

impl std::hash::Hash for ItemStatsLoaderInput {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.item_id.hash(state);
    }
}
