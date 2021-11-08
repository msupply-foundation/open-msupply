use super::{
    InvoiceNodeStatus, InvoiceNodeType, InvoiceSortFieldInput, ItemSortFieldInput,
    NameSortFieldInput,
};

use domain::{
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
    /// Sort query result by `key`
    pub key: T,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
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
    /// Search term must be an exact match (case sensitive)
    equal_to: Option<String>,
    /// Search term must be included in search candidate (case insensitive)
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

#[derive(InputObject, Clone)]
#[graphql(concrete(name = "EqualFilterStringInput", params(String)))]
#[graphql(concrete(name = "EqualFilterBooleanInput", params(bool)))]
#[graphql(concrete(name = "EqualFilterNumberInput", params(i32)))]
#[graphql(concrete(name = "EqualFilterInvoiceTypeInput", params(InvoiceNodeType)))]
#[graphql(concrete(name = "EqualFilterInvoiceStatusInput", params(InvoiceNodeStatus)))]
pub struct EqualFilterInput<T: InputType> {
    equal_to: Option<T>,
}

pub type EqualFilterBoolInput = EqualFilterInput<bool>;
pub type EqualFilterStringInput = EqualFilterInput<String>;
pub type EqualFilterNumberInput = EqualFilterInput<i32>;

impl<T> From<EqualFilterInput<T>> for EqualFilter<T>
where
    T: InputType,
{
    fn from(input: EqualFilterInput<T>) -> Self {
        EqualFilter {
            equal_to: input.equal_to,
            equal_any: None,
        }
    }
}

impl From<EqualFilterInput<InvoiceNodeType>> for EqualFilter<InvoiceType> {
    fn from(f: EqualFilterInput<InvoiceNodeType>) -> Self {
        EqualFilter {
            equal_to: f.equal_to.map(InvoiceType::from),
            equal_any: None,
        }
    }
}

impl From<EqualFilterInput<InvoiceNodeStatus>> for EqualFilter<InvoiceStatus> {
    fn from(f: EqualFilterInput<InvoiceNodeStatus>) -> Self {
        EqualFilter {
            equal_to: f.equal_to.map(InvoiceStatus::from),
            equal_any: None,
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
