use crate::EqualFilter;
use crate::RequisitionRowStatus;
use crate::RequisitionRowType;

pub mod requisition_line;
pub mod requisition_line_row;

pub use self::requisition_line::*;
pub use self::requisition_line_row::*;

#[derive(Clone, Debug, Default)]
pub struct RequisitionLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub requisition_id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<RequisitionRowType>>,
    pub item_id: Option<EqualFilter<String>>,
    pub requested_quantity: Option<EqualFilter<i32>>,
    pub status: Option<EqualFilter<RequisitionRowStatus>>,
}

impl RequisitionLineFilter {
    pub fn new() -> RequisitionLineFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
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

    pub fn r#type(mut self, filter: EqualFilter<RequisitionRowType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<RequisitionRowStatus>) -> Self {
        self.status = Some(filter);
        self
    }
}
