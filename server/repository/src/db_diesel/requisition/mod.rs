use domain::SimpleStringFilter;
use domain::{DatetimeFilter, EqualFilter, Sort};

use crate::schema::{RequisitionRowStatus, RequisitionRowType};

mod requisition;
mod requisition_row;

pub use self::requisition::*;
pub use self::requisition_row::*;

#[derive(Clone, Debug)]
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
}

pub enum RequisitionSortField {
    RequisitionNumber,
    Type,
    Status,
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
}

impl RequisitionRowStatus {
    pub fn equal_to(&self) -> EqualFilter<RequisitionRowStatus> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
        }
    }
}
