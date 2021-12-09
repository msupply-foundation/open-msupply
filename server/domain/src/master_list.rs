use super::{EqualFilter, SimpleStringFilter, Sort};

#[derive(Clone, Debug, PartialEq)]
pub struct MasterListFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<SimpleStringFilter>,
    pub code: Option<SimpleStringFilter>,
    pub description: Option<SimpleStringFilter>,
    pub exists_for_name: Option<SimpleStringFilter>,
    pub exists_for_name_id: Option<EqualFilter<String>>,
}

pub enum MasterListSortField {
    Name,
    Code,
    Description,
}

pub type MasterListSort = Sort<MasterListSortField>;

impl MasterListFilter {
    pub fn new() -> MasterListFilter {
        MasterListFilter {
            id: None,
            name: None,
            code: None,
            description: None,
            exists_for_name: None,
            exists_for_name_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn exists_for_name(mut self, filter: SimpleStringFilter) -> Self {
        self.exists_for_name = Some(filter);
        self
    }

    pub fn exists_for_name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.exists_for_name_id = Some(filter);
        self
    }
}
