use super::{
    InvoiceSortFieldInput, InvoiceStatusInput, InvoiceTypeInput, ItemSortFieldInput,
    NameSortFieldInput,
};

use crate::database::{
    repository::{DatetimeFilter, EqualFilter, SimpleStringFilter},
    schema::{InvoiceRowStatus, InvoiceRowType},
};

use async_graphql::{InputObject, InputType};
use chrono::NaiveDateTime;

#[derive(InputObject)]
#[graphql(concrete(name = "InvoiceSortInput", params(InvoiceSortFieldInput)))]
#[graphql(concrete(name = "ItemSortInput", params(ItemSortFieldInput)))]
#[graphql(concrete(name = "NameSortInput", params(NameSortFieldInput)))]
pub struct SortInput<T: InputType> {
    pub key: T,
    pub desc: Option<bool>,
}

// simple string filter

#[derive(InputObject, Clone)]
pub struct SimpleStringFilterInput {
    equal_to: Option<String>,
    like: Option<String>,
}

impl From<SimpleStringFilterInput> for SimpleStringFilter {
    fn from(f: SimpleStringFilterInput) -> Self {
        SimpleStringFilter {
            equal_to: f.equal_to,
            like: f.like,
        }
    }
}

// string equal filter

#[derive(InputObject, Clone)]
pub struct EqualFilterStringInput {
    equal_to: Option<String>,
}

impl From<EqualFilterStringInput> for EqualFilter<String> {
    fn from(f: EqualFilterStringInput) -> Self {
        EqualFilter {
            equal_to: f.equal_to,
        }
    }
}

// generic equal filters

#[derive(InputObject, Clone)]
#[graphql(concrete(name = "EqualFilterInvoiceTypeInput", params(InvoiceTypeInput)))]
#[graphql(concrete(name = "EqualFilterInvoiceStatusInput", params(InvoiceStatusInput)))]
pub struct EqualFilterInput<T: InputType> {
    equal_to: Option<T>,
}

impl From<EqualFilterInput<InvoiceTypeInput>> for EqualFilter<InvoiceRowType> {
    fn from(f: EqualFilterInput<InvoiceTypeInput>) -> Self {
        EqualFilter {
            equal_to: f.equal_to.map(InvoiceRowType::from),
        }
    }
}

impl From<EqualFilterInput<InvoiceStatusInput>> for EqualFilter<InvoiceRowStatus> {
    fn from(f: EqualFilterInput<InvoiceStatusInput>) -> Self {
        EqualFilter {
            equal_to: f.equal_to.map(InvoiceRowStatus::from),
        }
    }
}

// Datetime filter

#[derive(InputObject, Clone)]
pub struct DatetimeFilterInput {
    pub equal_to: Option<NaiveDateTime>,
    pub before_or_equal_to: Option<NaiveDateTime>,
    pub after_or_equal_to: Option<NaiveDateTime>,
}

impl From<DatetimeFilterInput> for DatetimeFilter {
    fn from(f: DatetimeFilterInput) -> Self {
        DatetimeFilter {
            equal_to: f.equal_to,
            before_or_equal_to: f.before_or_equal_to,
            after_or_equal_to: f.after_or_equal_to,
        }
    }
}
