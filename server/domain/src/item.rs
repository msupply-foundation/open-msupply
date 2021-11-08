use super::{EqualFilter, SimpleStringFilter, Sort};

#[derive(PartialEq, Debug)]
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
    pub name: Option<SimpleStringFilter>,
    pub code: Option<SimpleStringFilter>,
    /// If true it only returns ItemAndMasterList that have a name join row
    pub is_visible: Option<EqualFilter<bool>>,
}

pub enum ItemSortField {
    Name,
    Code,
}

pub type ItemSort = Sort<ItemSortField>;
