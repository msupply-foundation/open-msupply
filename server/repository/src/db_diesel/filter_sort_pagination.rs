use std::ops::Range;

use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Clone, PartialEq, Debug, Default)]
pub struct StringFilter {
    pub equal_to: Option<String>,
    pub not_equal_to: Option<String>,
    pub equal_any: Option<Vec<String>>,
    pub not_equal_all: Option<Vec<String>>,
    pub like: Option<String>,
    pub starts_with: Option<String>,
    pub ends_with: Option<String>,
}

impl StringFilter {
    pub fn equal_to(value: &str) -> Self {
        Self {
            equal_to: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn not_equal_to(value: &str) -> Self {
        Self {
            not_equal_to: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn equal_any(value: Vec<String>) -> Self {
        Self {
            equal_any: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn not_equal_all(value: Vec<String>) -> Self {
        Self {
            not_equal_all: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn like(value: &str) -> Self {
        Self {
            like: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn starts_with(value: &str) -> Self {
        Self {
            starts_with: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn ends_with(value: &str) -> Self {
        Self {
            ends_with: Some(value.to_owned()),
            ..Default::default()
        }
    }
}

#[derive(Clone, PartialEq, Debug, TS, Serialize, Deserialize)]
pub struct EqualFilter<T>
where
    T: 'static,
{
    #[ts(optional)]
    pub equal_to: Option<T>,
    #[ts(optional)]
    pub not_equal_to: Option<T>,
    #[ts(optional)]
    pub equal_any: Option<Vec<T>>,
    #[ts(optional)]
    pub equal_any_or_null: Option<Vec<T>>,
    #[ts(optional)]
    pub not_equal_all: Option<Vec<T>>,
    #[ts(optional)]
    pub is_null: Option<bool>,
}

impl<T> Default for EqualFilter<T> {
    fn default() -> Self {
        Self {
            equal_to: Default::default(),
            not_equal_to: Default::default(),
            equal_any: Default::default(),
            equal_any_or_null: Default::default(),
            not_equal_all: Default::default(),
            is_null: Default::default(),
        }
    }
}

impl<F> EqualFilter<F> {
    pub(crate) fn convert_filter<T>(self) -> EqualFilter<T>
    where
        T: From<F>,
    {
        let EqualFilter {
            equal_to,
            equal_any,
            not_equal_to,
            equal_any_or_null,
            not_equal_all,
            is_null,
        } = self;

        EqualFilter {
            equal_to: equal_to.map(T::from),
            equal_any: equal_any.map(|r| r.into_iter().map(T::from).collect()),
            not_equal_to: not_equal_to.map(T::from),
            equal_any_or_null: equal_any_or_null.map(|r| r.into_iter().map(T::from).collect()),
            not_equal_all: not_equal_all.map(|r| r.into_iter().map(T::from).collect()),
            is_null,
        }
    }
}

impl EqualFilter<bool> {
    pub fn equal_or_null_bool(value: bool) -> Self {
        Self {
            equal_any_or_null: Some(vec![value]),
            ..Default::default()
        }
    }
}

impl EqualFilter<i64> {
    pub fn equal_to_i64(value: i64) -> Self {
        Self {
            equal_to: Some(value),
            ..Default::default()
        }
    }
}

impl EqualFilter<i32> {
    pub fn equal_to_i32(value: i32) -> Self {
        Self {
            equal_to: Some(value),
            ..Default::default()
        }
    }

    pub fn not_equal_to_i32(value: i32) -> Self {
        Self {
            not_equal_to: Some(value),
            ..Default::default()
        }
    }

    pub fn i32_is_null(value: bool) -> Self {
        Self {
            is_null: Some(value),
            ..Default::default()
        }
    }
}

impl EqualFilter<f64> {
    pub fn equal_to_f64(value: f64) -> Self {
        Self {
            equal_to: Some(value),
            ..Default::default()
        }
    }

    pub fn not_equal_to_f64(value: f64) -> Self {
        Self {
            not_equal_to: Some(value),
            ..Default::default()
        }
    }
}

impl EqualFilter<String> {
    pub fn equal_to(value: &str) -> Self {
        Self {
            equal_to: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn not_equal_to(value: &str) -> Self {
        Self {
            not_equal_to: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn equal_any(value: Vec<String>) -> Self {
        Self {
            equal_any: Some(value),
            ..Default::default()
        }
    }

    pub fn equal_any_or_null(value: Vec<String>) -> Self {
        Self {
            equal_any_or_null: Some(value),
            ..Default::default()
        }
    }

    pub fn not_equal_all(value: Vec<String>) -> Self {
        Self {
            not_equal_all: Some(value),
            ..Default::default()
        }
    }

    pub fn is_null(value: bool) -> Self {
        Self {
            is_null: Some(value),
            ..Default::default()
        }
    }
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct NumberFilter<T> {
    /// ( {field} < range.start or range.end < {field} )
    pub not_in_range: Option<Range<T>>,
}

impl<T> NumberFilter<T> {
    pub fn not_in_range(value: Range<T>) -> Self {
        Self {
            not_in_range: Some(value),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct DatetimeFilter {
    pub equal_to: Option<NaiveDateTime>,
    pub before_or_equal_to: Option<NaiveDateTime>,
    pub before: Option<NaiveDateTime>,
    pub after_or_equal_to: Option<NaiveDateTime>,
    pub is_null: Option<bool>,
}

impl DatetimeFilter {
    pub fn date_range(from: NaiveDateTime, to: NaiveDateTime) -> DatetimeFilter {
        Self {
            after_or_equal_to: Some(from),
            before_or_equal_to: Some(to),
            ..Default::default()
        }
    }

    pub fn equal_to(value: NaiveDateTime) -> Self {
        Self {
            equal_to: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn after_or_equal_to(value: NaiveDateTime) -> Self {
        Self {
            after_or_equal_to: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn before_or_equal_to(value: NaiveDateTime) -> Self {
        Self {
            before_or_equal_to: Some(value),
            ..Default::default()
        }
    }

    pub fn before(value: NaiveDateTime) -> Self {
        Self {
            before: Some(value),
            ..Default::default()
        }
    }

    pub fn is_null(value: bool) -> Self {
        Self {
            is_null: Some(value),
            ..Default::default()
        }
    }
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct DateFilter {
    pub equal_to: Option<NaiveDate>,
    pub before_or_equal_to: Option<NaiveDate>,
    pub after_or_equal_to: Option<NaiveDate>,
}

impl DateFilter {
    pub fn date_range(from: &NaiveDate, to: &NaiveDate) -> DateFilter {
        Self {
            after_or_equal_to: Some(*from),
            before_or_equal_to: Some(*to),
            ..Default::default()
        }
    }

    pub fn after_or_equal_to(value: NaiveDate) -> Self {
        Self {
            after_or_equal_to: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn equal_to(value: NaiveDate) -> Self {
        Self {
            equal_to: Some(value.to_owned()),
            ..Default::default()
        }
    }

    pub fn before_or_equal_to(value: NaiveDate) -> Self {
        Self {
            before_or_equal_to: Some(value),
            ..Default::default()
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct Sort<T> {
    pub key: T,
    pub desc: Option<bool>,
}

pub const DEFAULT_PAGINATION_LIMIT: u32 = 100;

#[derive(Debug, PartialEq, Default)]
pub struct PaginationOption {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

pub struct Pagination {
    pub limit: u32,
    pub offset: u32,
}

impl Default for Pagination {
    fn default() -> Self {
        Pagination {
            offset: 0,
            limit: DEFAULT_PAGINATION_LIMIT,
        }
    }
}

impl Pagination {
    pub fn new() -> Pagination {
        Self::default()
    }

    pub fn all() -> Pagination {
        Pagination {
            offset: 0,
            limit: u32::MAX,
        }
    }

    pub fn one() -> Pagination {
        Pagination {
            offset: 0,
            limit: 1,
        }
    }
}
