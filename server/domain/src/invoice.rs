use chrono::NaiveDateTime;

use crate::AddToFilter;

use super::{DatetimeFilter, EqualFilter, SimpleStringFilter, Sort};

#[derive(PartialEq, Debug, Clone)]
pub enum InvoiceStatus {
    Draft,
    Confirmed,
    Finalised,
}
#[derive(PartialEq, Debug, Clone)]
pub enum InvoiceType {
    OutboundShipment,
    InboundShipment,
}

#[derive(PartialEq, Debug)]
pub struct Invoice {
    pub id: String,
    pub other_party_name: String,
    pub other_party_id: String,
    pub status: InvoiceStatus,
    pub on_hold: bool,
    pub r#type: InvoiceType,
    pub invoice_number: i32,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub entry_datetime: NaiveDateTime,
    pub confirm_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub color: Option<String>,
}
#[derive(Clone)]
pub struct InvoiceFilter {
    pub id: Option<EqualFilter<String>>,
    pub invoice_number: Option<EqualFilter<i32>>,
    pub name_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<InvoiceType>>,
    pub status: Option<EqualFilter<InvoiceStatus>>,
    pub comment: Option<SimpleStringFilter>,
    pub their_reference: Option<EqualFilter<String>>,
    pub entry_datetime: Option<DatetimeFilter>,
    pub confirm_datetime: Option<DatetimeFilter>,
    pub finalised_datetime: Option<DatetimeFilter>,
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
            entry_datetime: None,
            confirm_datetime: None,
            finalised_datetime: None,
        }
    }

    pub fn id<F: FnOnce(EqualFilter<String>) -> EqualFilter<String>>(mut self, f: F) -> Self {
        self.id = self.id.add(f);
        self
    }

    pub fn r#type<F: FnOnce(EqualFilter<InvoiceType>) -> EqualFilter<InvoiceType>>(
        mut self,
        f: F,
    ) -> Self {
        self.r#type = self.r#type.add(f);
        self
    }

    pub fn status<F: FnOnce(EqualFilter<InvoiceStatus>) -> EqualFilter<InvoiceStatus>>(
        mut self,
        f: F,
    ) -> Self {
        self.status = self.status.add(f);
        self
    }

    pub fn entry_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.entry_datetime = Some(filter);
        self
    }

    pub fn confirm_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.confirm_datetime = Some(filter);
        self
    }

    pub fn finalised_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.finalised_datetime = Some(filter);
        self
    }
}

pub enum InvoiceSortField {
    Type,
    OtherPartyName,
    InvoiceNumber,
    Comment,
    Status,
    EntryDatetime,
    ConfirmDatetime,
    FinalisedDateTime,
}

pub type InvoiceSort = Sort<InvoiceSortField>;

#[derive(Clone)]
pub struct InvoicePricing {
    pub total_after_tax: f64,
}
