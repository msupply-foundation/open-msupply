use crate::AddToFilter;

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

    pub fn id<F: FnOnce(EqualFilter<String>) -> EqualFilter<String>>(mut self, f: F) -> Self {
        self.id = self.id.add(f);
        self
    }

    pub fn name<F: FnOnce(EqualFilter<String>) -> EqualFilter<String>>(mut self, f: F) -> Self {
        self.name = self.name.add(f);
        self
    }

    pub fn code<F: FnOnce(EqualFilter<String>) -> EqualFilter<String>>(mut self, f: F) -> Self {
        self.code = self.code.add(f);
        self
    }

    pub fn store_id<F: FnOnce(EqualFilter<String>) -> EqualFilter<String>>(mut self, f: F) -> Self {
        self.store_id = self.store_id.add(f);
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
