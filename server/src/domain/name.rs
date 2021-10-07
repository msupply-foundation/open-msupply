use super::{SimpleStringFilter, Sort};

#[derive(PartialEq, Debug)]
pub struct Name {
    pub id: String,
    pub name: String,
    pub code: String,
    pub is_customer: bool,
    pub is_supplier: bool,
}
#[derive(Clone)]
pub struct NameFilter {
    pub name: Option<SimpleStringFilter>,
    pub code: Option<SimpleStringFilter>,
    pub is_customer: Option<bool>,
    pub is_supplier: Option<bool>,
}

pub enum NameSortField {
    Name,
    Code,
}

pub type NameSort = Sort<NameSortField>;
