use async_graphql::*;
use chrono::{NaiveDate, NaiveDateTime};
use service::report::definition::PrintReportSort;

#[derive(InputObject, Clone)]
pub struct TaxInput {
    /// Set or unset the tax value (in percentage)
    pub percentage: Option<f64>,
}

/// Update a nullable value
///
/// This struct is usually used as an optional value.
/// For example, in an API update input object like `mutableValue:  NullableUpdate | null | undefined`.
/// This is done to encode the following cases (using `mutableValue` from previous example):
/// 1) if `mutableValue` is `null | undefined`, nothing is updated
/// 2) if `mutableValue` object is set:
///     a) if `NullableUpdate.value` is `undefined | null`, the `mutableValue` is set to `null`
///     b) if `NullableUpdate.value` is set, the `mutableValue` is set to the provided `NullableUpdate.value`
#[derive(InputObject, Clone)]
#[graphql(concrete(name = "NullableStringUpdate", params(String)))]
#[graphql(concrete(name = "NullableDateUpdate", params(NaiveDate)))]
#[graphql(concrete(name = "NullableDatetimeUpdate", params(NaiveDateTime)))]
pub struct NullableUpdateInput<T: InputType> {
    pub value: Option<T>,
}

/// This struct is used to sort report data by a key and in descending or ascending order
#[derive(InputObject)]
pub struct PrintReportSortInput {
    /// Sort query result by `key`
    pub key: String,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    pub desc: Option<bool>,
}

impl PrintReportSortInput {
    /// Convert the input object `PrintReportSortInput` to a domain object `PrintReportSort`
    pub fn to_domain(self) -> PrintReportSort {
        PrintReportSort {
            key: self.key,
            desc: self.desc,
        }
    }
}

pub fn report_sort_to_typed_sort<T: strum::IntoEnumIterator + serde::Serialize>(
    sort: Option<PrintReportSortInput>,
) -> Option<(T, Option<bool>)> {
    match sort {
        None => None,
        Some(PrintReportSortInput { key, desc }) => T::iter()
            .find(|variant| {
                serde_json::to_string(variant)
                    .unwrap_or_default()
                    .trim_matches('"')
                    == key.to_lowercase()
            })
            .map(|variant| (variant, desc)),
    }
}
