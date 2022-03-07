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
mod requisition_supply_status;
mod stock_line;
mod stocktake_lines;
mod store;
mod user_account;

use std::{collections::HashSet, hash::Hasher};

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
pub use requisition_supply_status::*;
pub use stock_line::*;
pub use stocktake_lines::*;
pub use store::StoreLoader;
pub use user_account::UserAccountLoader;

#[derive(Debug, Clone)]
pub struct IdPairWithPayload<T>
where
    T: Clone,
{
    pub primary_id: String,
    pub secondary_id: String,
    pub payload: T,
}

impl<T: Clone> IdPairWithPayload<T> {
    pub fn get_all_secondary_ids(id_pairs: &[IdPairWithPayload<T>]) -> Vec<String> {
        id_pairs
            .iter()
            .map(|id_pair| id_pair.secondary_id.clone())
            .collect()
    }

    fn extract_unique_ids(id_pairs: &[IdPairWithPayload<T>]) -> (Vec<String>, Vec<String>) {
        let mut primary_ids: HashSet<String> = HashSet::new();
        let mut seconday_ids: HashSet<String> = HashSet::new();

        for IdPairWithPayload {
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

impl<T: Clone> PartialEq for IdPairWithPayload<T> {
    fn eq(&self, other: &Self) -> bool {
        self.primary_id == other.primary_id && self.secondary_id == other.secondary_id
    }
}

impl<T: Clone> Eq for IdPairWithPayload<T> {}

impl<T: Clone> std::hash::Hash for IdPairWithPayload<T> {
    fn hash<H: Hasher>(&self, state: &mut H) {
        format!("{}{}", self.primary_id, self.secondary_id).hash(state);
    }
}

#[derive(Clone)]
pub struct EmptyPayload;
pub type RequisitionAndItemId = IdPairWithPayload<EmptyPayload>;
impl RequisitionAndItemId {
    pub fn new(requisition_id: &str, item_id: &str) -> Self {
        RequisitionAndItemId {
            primary_id: requisition_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}
