use super::{EqualFilter, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct Location {
    pub id: String,
    pub name: String,
    pub code: String,
    pub on_hold: bool,
}
#[derive(Clone, PartialEq, Debug)]
pub struct LocationFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
    pub code: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
}

impl LocationFilter {
    pub fn new() -> LocationFilter {
        LocationFilter {
            id: None,
            name: None,
            code: None,
            store_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: EqualFilter<String>) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn code(mut self, filter: EqualFilter<String>) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
}
#[derive(PartialEq, Debug)]
pub enum LocationSortField {
    Name,
    Code,
}

pub type LocationSort = Sort<LocationSortField>;

pub struct InsertLocation {
    pub id: String,
    pub code: String,
    pub name: Option<String>,
    pub on_hold: Option<bool>,
}

pub struct UpdateLocation {
    pub id: String,
    pub code: Option<String>,
    pub name: Option<String>,
    pub on_hold: Option<bool>,
}

pub struct DeleteLocation {
    pub id: String,
}
