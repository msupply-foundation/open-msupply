pub mod invoice;
pub mod invoice_line;
pub mod item;
pub mod name;
pub mod stock_line;
pub mod supplier_invoice;
use chrono::NaiveDateTime;

#[derive(Clone)]
pub struct SimpleStringFilter {
    pub equal_to: Option<String>,
    pub like: Option<String>,
}
#[derive(Clone)]
pub struct EqualFilter<T> {
    pub equal_to: Option<T>,
}
#[derive(Clone)]
pub struct DatetimeFilter {
    pub equal_to: Option<NaiveDateTime>,
    pub before_or_equal_to: Option<NaiveDateTime>,
    pub after_or_equal_to: Option<NaiveDateTime>,
}
pub struct Sort<T> {
    pub key: T,
    pub desc: Option<bool>,
}

pub const DEFAULT_LIMIT: u32 = 100;

pub struct PaginationOption {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

pub struct Pagination {
    pub limit: u32,
    pub offset: u32,
}

impl Pagination {
    pub fn new() -> Pagination {
        Pagination {
            offset: 0,
            limit: DEFAULT_LIMIT,
        }
    }

    pub fn one() -> Pagination {
        Pagination {
            offset: 0,
            limit: 1,
        }
    }
}
