use crate::SimpleStringFilter;
use crate::{DatetimeFilter, EqualFilter, Sort};

use crate::requisition_row::{RequisitionRowStatus, RequisitionRowType};

mod requisition;
pub mod requisition_row;

pub use self::requisition::*;
pub use self::requisition_row::*;

#[derive(Clone, Debug, PartialEq)]
pub struct RequisitionFilter {
    pub id: Option<EqualFilter<String>>,
    pub requisition_number: Option<EqualFilter<i64>>,
    pub r#type: Option<EqualFilter<RequisitionRowType>>,
    pub status: Option<EqualFilter<RequisitionRowStatus>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub sent_datetime: Option<DatetimeFilter>,
    pub finalised_datetime: Option<DatetimeFilter>,
    pub name_id: Option<EqualFilter<String>>,
    pub name: Option<SimpleStringFilter>,
    pub colour: Option<EqualFilter<String>>,
    pub their_reference: Option<SimpleStringFilter>,
    pub comment: Option<SimpleStringFilter>,
    pub store_id: Option<EqualFilter<String>>,
    pub linked_requisition_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum RequisitionSortField {
    RequisitionNumber,
    Type,
    Status,
    Comment,
    OtherPartyName,
    SentDatetime,
    CreatedDatetime,
    FinalisedDatetime,
}

pub type RequisitionSort = Sort<RequisitionSortField>;

impl RequisitionFilter {
    pub fn new() -> RequisitionFilter {
        RequisitionFilter {
            id: None,
            requisition_number: None,
            r#type: None,
            status: None,
            created_datetime: None,
            sent_datetime: None,
            finalised_datetime: None,
            name_id: None,
            name: None,
            colour: None,
            their_reference: None,
            comment: None,
            store_id: None,
            linked_requisition_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: SimpleStringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<RequisitionRowStatus>) -> Self {
        self.status = Some(filter);
        self
    }

    pub fn comment(mut self, filter: SimpleStringFilter) -> Self {
        self.comment = Some(filter);
        self
    }

    pub fn requisition_number(mut self, filter: EqualFilter<i64>) -> Self {
        self.requisition_number = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<RequisitionRowType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn linked_requisition_id(mut self, filter: EqualFilter<String>) -> Self {
        self.linked_requisition_id = Some(filter);
        self
    }
}

impl RequisitionRowStatus {
    pub fn equal_to(&self) -> EqualFilter<RequisitionRowStatus> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
        }
    }
}

impl RequisitionRowType {
    pub fn equal_to(&self) -> EqualFilter<RequisitionRowType> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
        }
    }
}
