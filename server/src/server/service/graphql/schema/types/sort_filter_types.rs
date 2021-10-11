use super::{
    InvoiceSortFieldInput, InvoiceStatusInput, InvoiceTypeInput, ItemSortFieldInput,
    NameSortFieldInput,
};

use crate::{
    database::{
        repository::{
            DatetimeFilter as DatetimeFilterPrev, EqualFilter as EqualFilterPrev,
            SimpleStringFilter as SimpleStringFilterPrev,
        },
        schema::{InvoiceRowStatus, InvoiceRowType},
    },
    domain::{DatetimeFilter, EqualFilter, SimpleStringFilter, Sort},
};

use async_graphql::{InputObject, InputType};
use chrono::NaiveDateTime;

#[derive(InputObject)]
#[graphql(concrete(name = "InvoiceSortInput", params(InvoiceSortFieldInput)))]
#[graphql(concrete(name = "NameSortInput", params(NameSortFieldInput)))]
#[graphql(concrete(name = "ItemSortInput", params(ItemSortFieldInput)))]
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

impl From<SimpleStringFilterInput> for SimpleStringFilterPrev {
    fn from(f: SimpleStringFilterInput) -> Self {
        SimpleStringFilterPrev {
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

impl From<EqualFilterStringInput> for EqualFilterPrev<String> {
    fn from(f: EqualFilterStringInput) -> Self {
        EqualFilterPrev {
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

impl From<EqualFilterInput<InvoiceTypeInput>> for EqualFilterPrev<InvoiceRowType> {
    fn from(f: EqualFilterInput<InvoiceTypeInput>) -> Self {
        EqualFilterPrev {
            equal_to: f.equal_to.map(InvoiceRowType::from),
        }
    }
}

impl From<EqualFilterInput<InvoiceStatusInput>> for EqualFilterPrev<InvoiceRowStatus> {
    fn from(f: EqualFilterInput<InvoiceStatusInput>) -> Self {
        EqualFilterPrev {
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

impl From<DatetimeFilterInput> for DatetimeFilterPrev {
    fn from(f: DatetimeFilterInput) -> Self {
        DatetimeFilterPrev {
            equal_to: f.equal_to,
            before_or_equal_to: f.before_or_equal_to,
            after_or_equal_to: f.after_or_equal_to,
        }
    }
}
