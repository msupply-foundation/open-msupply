use super::EqualFilter;

#[derive(Clone, Debug, PartialEq)]
pub struct MasterListLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub master_list_id: Option<EqualFilter<String>>,
}

impl MasterListLineFilter {
    pub fn new() -> MasterListLineFilter {
        MasterListLineFilter {
            id: None,
            master_list_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn master_list_id(mut self, filter: EqualFilter<String>) -> Self {
        self.master_list_id = Some(filter);
        self
    }
}
