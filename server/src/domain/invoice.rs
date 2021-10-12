use chrono::NaiveDateTime;

use super::{DatetimeFilter, EqualFilter, SimpleStringFilter, Sort};

#[derive(PartialEq, Debug, Clone)]
pub enum InvoiceStatus {
    Draft,
    Confirmed,
    Finalised,
}
#[derive(PartialEq, Debug, Clone)]
pub enum InvoiceType {
    CustomerInvoice,
    SupplierInvoice,
}

#[derive(PartialEq, Debug)]
pub struct Invoice {
    pub id: String,
    pub other_party_name: String,
    pub other_party_id: String,
    pub status: InvoiceStatus,
    pub r#type: InvoiceType,
    pub invoice_number: i32,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub entry_datetime: NaiveDateTime,
    pub confirm_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
}
#[derive(Clone)]
pub struct InvoiceFilter {
    pub id: Option<EqualFilter<String>>,
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

    pub fn match_id(mut self, id: &str) -> Self {
        self.id = Some(EqualFilter {
            equal_to: Some(id.to_owned()),
        });

        self
    }

    pub fn set_entry_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.entry_datetime = Some(filter);

        self
    }

    pub fn set_confirm_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.confirm_datetime = Some(filter);

        self
    }

    pub fn set_finalised_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.finalised_datetime = Some(filter);

        self
    }
}

pub enum InvoiceSortField {
    Type,
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
