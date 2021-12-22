use super::Sort;

#[derive(PartialEq, Debug, Clone)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub code: String,
    // Is visible is from master list join
    pub is_visible: bool,
    pub unit_name: Option<String>,
}

pub enum ItemSortField {
    Name,
    Code,
}

pub type ItemSort = Sort<ItemSortField>;
