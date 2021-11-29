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

    pub fn match_id(mut self, id: &str) -> Self {
        self.id = Some(EqualFilter {
            equal_to: Some(id.to_owned()),
            equal_any: None,
        });

        self
    }

    pub fn match_ids(mut self, ids: Vec<String>) -> Self {
        self.id = Some(EqualFilter {
            equal_to: None,
            equal_any: Some(ids),
        });

        self
    }

    pub fn match_name(mut self, name: &str) -> Self {
        self.name = Some(EqualFilter {
            equal_to: Some(name.to_owned()),
            equal_any: None,
        });

        self
    }

    pub fn match_code(mut self, code: &str) -> Self {
        self.code = Some(EqualFilter {
            equal_to: Some(code.to_owned()),
            equal_any: None,
        });

        self
    }

    pub fn match_store_id(mut self, store_id: &str) -> Self {
        self.store_id = Some(EqualFilter {
            equal_to: Some(store_id.to_owned()),
            equal_any: None,
        });

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
