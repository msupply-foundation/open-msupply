mod inventory_adjustment_reason;
mod invoice;
mod invoice_line;
mod item;
mod item_stats;
mod item_stock_on_hand;
mod loader_registry;
mod location;
mod master_list_line;
mod name;
mod name_row;
mod requisition;
mod requisition_line;
mod requisition_supply_status;
mod stock_line;
mod stocktake_lines;
mod store;
mod user;

use std::{collections::HashSet, hash::Hasher};

pub use inventory_adjustment_reason::*;
pub use invoice::*;
pub use invoice_line::*;
pub use item::ItemLoader;
pub use item_stats::*;
pub use item_stock_on_hand::*;
pub use loader_registry::{get_loaders, LoaderMap, LoaderRegistry};
pub use location::LocationByIdLoader;
pub use master_list_line::MasterListLineByMasterListId;
pub use name::*;
pub use name_row::*;
pub use requisition::*;
pub use requisition_line::*;
pub use requisition_supply_status::*;
pub use stock_line::*;
pub use stocktake_lines::*;
pub use store::*;
pub use user::*;

#[derive(Debug, Clone)]
/// Sometimes loaders need to take an extra parameter, like store_id or requisition_id
/// And in some cases even further parameter is required (lookback date for ItemStats)
/// New types can be defined for each loader based on it's needs, but to make it easier
/// to add new complex loader inputs generic IdPair is used (don't need to impl (Hash, Eq, PartialEq)
/// also helper methods are provided to extract unique ids from &[IdPair] that is passed to load method
/// See StockLineByItemAndStoreIdLoaderInput for payload example
pub struct IdPair<T>
where
    T: Clone,
{
    pub primary_id: String,
    pub secondary_id: String,
    pub payload: T,
}

impl<T: Clone> IdPair<T> {
    pub fn get_all_secondary_ids(id_pairs: &[IdPair<T>]) -> Vec<String> {
        id_pairs
            .iter()
            .map(|id_pair| id_pair.secondary_id.clone())
            .collect()
    }

    fn extract_unique_ids(id_pairs: &[IdPair<T>]) -> (Vec<String>, Vec<String>) {
        let mut primary_ids: HashSet<String> = HashSet::new();
        let mut seconday_ids: HashSet<String> = HashSet::new();

        for IdPair {
            primary_id,
            secondary_id,
            ..
        } in id_pairs
        {
            primary_ids.insert(primary_id.clone());
            seconday_ids.insert(secondary_id.clone());
        }

        (
            primary_ids.into_iter().collect(),
            seconday_ids.into_iter().collect(),
        )
    }
}

impl<T: Clone> PartialEq for IdPair<T> {
    fn eq(&self, other: &Self) -> bool {
        self.primary_id == other.primary_id && self.secondary_id == other.secondary_id
    }
}

impl<T: Clone> Eq for IdPair<T> {}

impl<T: Clone> std::hash::Hash for IdPair<T> {
    fn hash<H: Hasher>(&self, state: &mut H) {
        format!("{}{}", self.primary_id, self.secondary_id).hash(state);
    }
}

#[derive(Clone)]
// Using struct instead of () to avoid conflicting new implementations
pub struct EmptyPayload;
pub type RequisitionAndItemId = IdPair<EmptyPayload>;
impl RequisitionAndItemId {
    pub fn new(requisition_id: &str, item_id: &str) -> Self {
        RequisitionAndItemId {
            primary_id: requisition_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}
