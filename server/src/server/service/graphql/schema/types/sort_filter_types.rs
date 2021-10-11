use super::{
    InvoiceSortFieldInput, InvoiceStatusInput, InvoiceTypeInput, ItemSortFieldInput,
    NameSortFieldInput,
};

use crate::database::{
    repository::{DatetimeFilter, EqualFilter, SimpleStringFilter, Sort},
    schema::{InvoiceRowStatus, InvoiceRowType},
};

use async_graphql::{InputObject, InputType};
use chrono::{DateTime, Utc};

#[derive(InputObject)]
#[graphql(concrete(name = "InvoiceSortInput", params(InvoiceSortFieldInput)))]
#[graphql(concrete(name = "ItemSortInput", params(ItemSortFieldInput)))]
#[graphql(concrete(name = "NameSortInput", params(NameSortFieldInput)))]
pub struct SortInput<T: InputType> {
    pub key: T,
    pub desc: Option<bool>,
}

impl<TInput, T> From<&SortInput<TInput>> for Sort<T>
where
    TInput: InputType + Copy,
    T: From<TInput>,
{
    fn from(sort: &SortInput<TInput>) -> Self {
        Sort {
            key: T::from(sort.key),
            desc: sort.desc,
        }
    }
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

// bool equal filter

#[derive(InputObject, Clone)]
pub struct EqualFilterBoolInput {
    equal_to: Option<bool>,
}

impl From<EqualFilterBoolInput> for EqualFilter<bool> {
    fn from(f: EqualFilterBoolInput) -> Self {
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
    pub equal_to: Option<DateTime<Utc>>,
    pub before_or_equal_to: Option<DateTime<Utc>>,
    pub after_or_equal_to: Option<DateTime<Utc>>,
}

impl From<DatetimeFilterInput> for DatetimeFilter {
    fn from(f: DatetimeFilterInput) -> Self {
        DatetimeFilter {
            equal_to: f.equal_to.map(|t| t.naive_utc()),
            before_or_equal_to: f.before_or_equal_to.map(|t| t.naive_utc()),
            after_or_equal_to: f.after_or_equal_to.map(|t| t.naive_utc()),
        }
    }
}
