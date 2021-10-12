use chrono::NaiveDateTime;

/// Simple string filter for list queries
pub struct SimpleStringFilter {
    pub equal_to: Option<String>,
    pub like: Option<String>,
}

/// Filter for list queries
pub struct EqualFilter<T> {
    pub equal_to: Option<T>,
}

/// Datetime filter for list queries
pub struct DatetimeFilter {
    pub equal_to: Option<NaiveDateTime>,
    pub before_or_equal_to: Option<NaiveDateTime>,
    pub after_or_equal_to: Option<NaiveDateTime>,
}

/// Generic sort option for list queries
pub struct Sort<T> {
    pub key: T,
    pub desc: Option<bool>,
}
