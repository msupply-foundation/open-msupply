use crate::EqualFilter;
use crate::FloatFilter;
use crate::RequisitionStatus;
use crate::RequisitionType;
use crate::Sort;
use crate::StringFilter;

pub mod requisition_line;
pub mod requisition_line_row;

pub use self::requisition_line::*;
pub use self::requisition_line_row::*;

#[derive(Clone, Debug, Default)]
pub struct RequisitionLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub requisition_id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<RequisitionType>>,
    pub item_id: Option<EqualFilter<String>>,
    pub item_code_or_name: Option<StringFilter>,
    pub requested_quantity: Option<EqualFilter<f64>>,
    pub status: Option<EqualFilter<RequisitionStatus>>,
    pub comment: Option<StringFilter>,
    pub months_of_stock: Option<FloatFilter>,
}

#[derive(PartialEq, Debug)]
pub enum RequisitionLineSortField {
    ItemCode,
    ItemName,
    RequestedQuantity,
    SuggestedQuantity,
    SupplyQuantity,
    ApprovedQuantity,
    Comment,
    DefaultPackSize,
    MonthsOfStock,
}

pub type RequisitionLineSort = Sort<RequisitionLineSortField>;

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

    pub fn requested_quantity(mut self, filter: EqualFilter<f64>) -> Self {
        self.requested_quantity = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<RequisitionType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<RequisitionStatus>) -> Self {
        self.status = Some(filter);
        self
    }

    pub fn comment(mut self, filter: StringFilter) -> Self {
        self.comment = Some(filter);
        self
    }

    pub fn months_of_stock(mut self, filter: FloatFilter) -> Self {
        self.months_of_stock = Some(filter);
        self
    }
}
