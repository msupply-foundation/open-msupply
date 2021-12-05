use super::{DatetimeFilter, EqualFilter, SimpleStringFilter, Sort};
use chrono::NaiveDateTime;

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

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<InvoiceType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<InvoiceStatus>) -> Self {
        self.status = Some(filter);
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
    pub invoice_id: String,
    // Total for all lines
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    // Total for all stock lines
    pub stock_total_before_tax: f64,
    pub stock_total_after_tax: f64,
    // Total for all service lines
    pub service_total_before_tax: f64,
    pub service_total_after_tax: f64,
}

impl InvoicePricing {
    pub fn new(invoice_id: &str) -> Self {
        InvoicePricing {
            invoice_id: invoice_id.to_string(),
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            stock_total_before_tax: 0.0,
            stock_total_after_tax: 0.0,
            service_total_before_tax: 0.0,
            service_total_after_tax: 0.0,
        }
    }
}

impl InvoiceStatus {
    pub fn equal_to(&self) -> EqualFilter<InvoiceStatus> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
        }
    }

    pub fn not_equal_to(&self) -> EqualFilter<InvoiceStatus> {
        EqualFilter {
            equal_to: None,
            not_equal_to: Some(self.clone()),
            equal_any: None,
        }
    }

    pub fn equal_any(value: Vec<InvoiceStatus>) -> EqualFilter<InvoiceStatus> {
        EqualFilter {
            equal_to: None,
            not_equal_to: None,
            equal_any: Some(value),
        }
    }
}

impl InvoiceType {
    pub fn equal_to(&self) -> EqualFilter<InvoiceType> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
        }
    }

    pub fn not_equal_to(&self) -> EqualFilter<InvoiceType> {
        EqualFilter {
            equal_to: None,
            not_equal_to: Some(self.clone()),
            equal_any: None,
        }
    }

    pub fn equal_any(value: Vec<InvoiceType>) -> EqualFilter<InvoiceType> {
        EqualFilter {
            equal_to: None,
            not_equal_to: None,
            equal_any: Some(value),
        }
    }
}
