use crate::EqualFilter;

mod requisition_line;
pub mod requisition_line_row;

pub use self::requisition_line::*;
pub use self::requisition_line_row::*;

#[derive(Clone, Debug)]
pub struct RequisitionLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub requisition_id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub requested_quantity: Option<EqualFilter<i32>>,
}

impl RequisitionLineFilter {
    pub fn new() -> RequisitionLineFilter {
        RequisitionLineFilter {
            id: None,
            requisition_id: None,
            requested_quantity: None,
            item_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn requisition_id(mut self, filter: EqualFilter<String>) -> Self {
        self.requisition_id = Some(filter);
        self
    }

    pub fn requested_quantity(mut self, filter: EqualFilter<i32>) -> Self {
        self.requested_quantity = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }
}
