use super::{DatetimeFilter, EqualFilter, SimpleStringFilter, Sort};
use chrono::NaiveDateTime;

#[derive(PartialEq, Debug, Clone)]
pub enum InvoiceStatus {
    New,
    Allocated,
    Picked,
    Shipped,
    Delivered,
    Verified,
}
#[derive(PartialEq, Debug, Clone)]
pub enum InvoiceType {
    OutboundShipment,
    InboundShipment,
    InventoryAdjustment,
}

#[derive(PartialEq, Debug, Clone)]
pub struct Invoice {
    pub id: String,
    pub other_party_name: String,
    pub other_party_id: String,
    pub other_party_store_id: Option<String>,
    pub status: InvoiceStatus,
    pub on_hold: bool,
    pub r#type: InvoiceType,
    pub invoice_number: i64,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub created_datetime: NaiveDateTime,
    pub allocated_datetime: Option<NaiveDateTime>,
    pub picked_datetime: Option<NaiveDateTime>,
    pub shipped_datetime: Option<NaiveDateTime>,
    pub delivered_datetime: Option<NaiveDateTime>,
    pub verified_datetime: Option<NaiveDateTime>,
    pub colour: Option<String>,
    pub requisition_id: Option<String>,
}
#[derive(Clone)]
pub struct InvoiceFilter {
    pub id: Option<EqualFilter<String>>,
    pub invoice_number: Option<EqualFilter<i64>>,
    pub name_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<InvoiceType>>,
    pub status: Option<EqualFilter<InvoiceStatus>>,
    pub comment: Option<SimpleStringFilter>,
    pub their_reference: Option<EqualFilter<String>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub allocated_datetime: Option<DatetimeFilter>,
    pub picked_datetime: Option<DatetimeFilter>,
    pub shipped_datetime: Option<DatetimeFilter>,
    pub delivered_datetime: Option<DatetimeFilter>,
    pub verified_datetime: Option<DatetimeFilter>,
    pub requisition_id: Option<EqualFilter<String>>,
}

impl InvoiceFilter {
    pub fn new() -> InvoiceFilter {
        InvoiceFilter {
            id: None,
            invoice_number: None,
            name_id: None,
            store_id: None,
            r#type: None,
            status: None,
            comment: None,
            their_reference: None,
            created_datetime: None,
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            requisition_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<InvoiceType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn invoice_number(mut self, filter: EqualFilter<i64>) -> Self {
        self.invoice_number = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<InvoiceStatus>) -> Self {
        self.status = Some(filter);
        self
    }

    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
        self
    }

    pub fn allocated_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.allocated_datetime = Some(filter);
        self
    }

    pub fn picked_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.picked_datetime = Some(filter);
        self
    }

    pub fn shipped_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.shipped_datetime = Some(filter);
        self
    }

    pub fn delivered_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.delivered_datetime = Some(filter);
        self
    }

    pub fn verified_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.verified_datetime = Some(filter);
        self
    }

    pub fn requisition_id(mut self, filter: EqualFilter<String>) -> Self {
        self.requisition_id = Some(filter);
        self
    }
}

pub enum InvoiceSortField {
    Type,
    OtherPartyName,
    InvoiceNumber,
    Comment,
    Status,
    CreatedDatetime,
    AllocatedDatetime,
    PickedDatetime,
    ShippedDatetime,
    DeliveredDatetime,
    VerifiedDatetime,
}

pub type InvoiceSort = Sort<InvoiceSortField>;

impl InvoiceStatus {
    pub fn equal_to(&self) -> EqualFilter<InvoiceStatus> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
        }
    }

    pub fn not_equal_to(&self) -> EqualFilter<InvoiceStatus> {
        EqualFilter {
            equal_to: None,
            not_equal_to: Some(self.clone()),
            equal_any: None,
            not_equal_all: None,
        }
    }

    pub fn equal_any(value: Vec<InvoiceStatus>) -> EqualFilter<InvoiceStatus> {
        EqualFilter {
            equal_to: None,
            not_equal_to: None,
            equal_any: Some(value),
            not_equal_all: None,
        }
    }
}

impl InvoiceType {
    pub fn equal_to(&self) -> EqualFilter<InvoiceType> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
        }
    }

    pub fn not_equal_to(&self) -> EqualFilter<InvoiceType> {
        EqualFilter {
            equal_to: None,
            not_equal_to: Some(self.clone()),
            equal_any: None,
            not_equal_all: None,
        }
    }

    pub fn equal_any(value: Vec<InvoiceType>) -> EqualFilter<InvoiceType> {
        EqualFilter {
            equal_to: None,
            not_equal_to: None,
            equal_any: Some(value),
            not_equal_all: None,
        }
    }
}

impl InvoiceStatus {
    pub fn index(&self) -> u8 {
        match self {
            InvoiceStatus::New => 1,
            InvoiceStatus::Allocated => 2,
            InvoiceStatus::Picked => 3,
            InvoiceStatus::Shipped => 4,
            InvoiceStatus::Delivered => 5,
            InvoiceStatus::Verified => 6,
        }
    }
}
