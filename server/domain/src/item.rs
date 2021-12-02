use crate::EqualFilter;

use super::{SimpleStringFilter, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub code: String,
    // Is visible is from master list join
    pub is_visible: bool,
    pub unit_name: Option<String>,
}
#[derive(Clone)]
pub struct ItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<SimpleStringFilter>,
    pub code: Option<SimpleStringFilter>,
    /// If true it only returns ItemAndMasterList that have a name join row
    pub is_visible: Option<bool>,
}

pub enum ItemSortField {
    Name,
    Code,
}

pub type ItemSort = Sort<ItemSortField>;
