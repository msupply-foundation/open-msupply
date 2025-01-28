use util::inline_init;

use crate::{DateFilter, DatetimeFilter, EqualFilter, Sort, StringFilter};

pub mod requisition;
pub mod requisition_row;

pub use self::requisition::*;
pub use self::requisition_row::*;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct RequisitionFilter {
    pub id: Option<EqualFilter<String>>,
    pub user_id: Option<EqualFilter<String>>,
    pub requisition_number: Option<EqualFilter<i64>>,
    pub r#type: Option<EqualFilter<RequisitionRowType>>,
    pub status: Option<EqualFilter<RequisitionRowStatus>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub sent_datetime: Option<DatetimeFilter>,
    pub finalised_datetime: Option<DatetimeFilter>,
    pub expected_delivery_date: Option<DateFilter>,
    pub name_id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub colour: Option<EqualFilter<String>>,
    pub their_reference: Option<StringFilter>,
    pub comment: Option<StringFilter>,
    pub store_id: Option<EqualFilter<String>>,
    pub linked_requisition_id: Option<EqualFilter<String>>,
    pub order_type: Option<EqualFilter<String>>,
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
    ExpectedDeliveryDate,
    TheirReference,
    OrderType,
    ProgramName,
    PeriodName,
}

pub type RequisitionSort = Sort<RequisitionSortField>;

impl RequisitionFilter {
    pub fn new() -> RequisitionFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn user_id(mut self, filter: EqualFilter<String>) -> Self {
        self.user_id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<RequisitionRowStatus>) -> Self {
        self.status = Some(filter);
        self
    }

    pub fn comment(mut self, filter: StringFilter) -> Self {
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

    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
        self
    }

    pub fn sent_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.sent_datetime = Some(filter);
        self
    }

    pub fn finalised_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.finalised_datetime = Some(filter);
        self
    }

    pub fn expected_delivery_date(mut self, filter: DateFilter) -> Self {
        self.expected_delivery_date = Some(filter);
        self
    }

    pub fn name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.name_id = Some(filter);
        self
    }

    pub fn colour(mut self, filter: EqualFilter<String>) -> Self {
        self.colour = Some(filter);
        self
    }

    pub fn their_reference(mut self, filter: StringFilter) -> Self {
        self.their_reference = Some(filter);
        self
    }

    pub fn by_id(id: &str) -> RequisitionFilter {
        RequisitionFilter::new().id(EqualFilter::equal_to(id))
    }

    pub fn by_linked_requisition_id(id: &str) -> RequisitionFilter {
        RequisitionFilter::new().linked_requisition_id(EqualFilter::equal_to(id))
    }

    pub fn order_type(mut self, filter: EqualFilter<String>) -> Self {
        self.order_type = Some(filter);
        self
    }
}

impl RequisitionRowStatus {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.not_equal_to = Some(self.clone()))
    }
}

impl RequisitionRowType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
}
