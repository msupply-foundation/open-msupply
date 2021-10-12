use super::{
    InvoiceNodeStatus, InvoiceNodeType, InvoiceSortFieldInput, ItemSortFieldInput,
    NameSortFieldInput,
};

use crate::domain::{
    invoice::{InvoiceStatus, InvoiceType},
    DatetimeFilter, EqualFilter, SimpleStringFilter, Sort,
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

impl<TInput, T> From<SortInput<TInput>> for Sort<T>
where
    TInput: InputType,
    T: From<TInput>,
{
    fn from(sort: SortInput<TInput>) -> Self {
        Sort {
            key: T::from(sort.key),
            desc: sort.desc,
        }
    }
}

pub fn convert_sort<FromField, ToField>(
    from: Option<Vec<SortInput<FromField>>>,
) -> Option<Sort<ToField>>
where
    FromField: InputType,
    Sort<ToField>: From<SortInput<FromField>>,
{
    // Currently only one sort option is supported, use the first from the list.
    from.map(|mut sort_list| sort_list.pop())
        .flatten()
        .map(Sort::from)
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
#[graphql(concrete(name = "EqualFilterInvoiceTypeInput", params(InvoiceNodeType)))]
#[graphql(concrete(name = "EqualFilterInvoiceStatusInput", params(InvoiceNodeStatus)))]
pub struct EqualFilterInput<T: InputType> {
    equal_to: Option<T>,
}

impl From<EqualFilterInput<InvoiceNodeType>> for EqualFilter<InvoiceType> {
    fn from(f: EqualFilterInput<InvoiceNodeType>) -> Self {
        EqualFilter {
            equal_to: f.equal_to.map(InvoiceType::from),
        }
    }
}

impl From<EqualFilterInput<InvoiceNodeStatus>> for EqualFilter<InvoiceStatus> {
    fn from(f: EqualFilterInput<InvoiceNodeStatus>) -> Self {
        EqualFilter {
            equal_to: f.equal_to.map(InvoiceStatus::from),
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
