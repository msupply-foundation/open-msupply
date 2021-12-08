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

impl ItemFilter {
    pub fn new() -> ItemFilter {
        ItemFilter {
            id: None,
            name: None,
            code: None,
            is_visible: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: SimpleStringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn code(mut self, filter: SimpleStringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn match_is_visible(mut self, value: bool) -> Self {
        self.is_visible = Some(value);
        self
    }
}

pub enum ItemSortField {
    Name,
    Code,
}

pub type ItemSort = Sort<ItemSortField>;
