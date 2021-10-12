use super::{EqualFilter, SimpleStringFilter, Sort};

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
    pub id: Option<EqualFilter<String>>,
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

impl NameFilter {
    pub fn new() -> NameFilter {
        NameFilter {
            id: None,
            name: None,
            code: None,
            is_customer: None,
            is_supplier: None,
        }
    }

    pub fn match_id(mut self, id: &str) -> Self {
        self.id = Some(EqualFilter {
            equal_to: Some(id.to_owned()),
        });

        self
    }
}
