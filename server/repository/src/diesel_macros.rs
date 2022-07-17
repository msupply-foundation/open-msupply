/// Example expand, when called with:
///
/// ```
/// apply_equal_filter!(query, filter.id, location_dsl::id)
/// ```
///
/// ```
/// if let Some(equal_filter) = filter.id {
///     if let Some(value) = equal_filter.equal_to {
///         query = query.filterd(location_dsl::id.eq(value));
///     }
///
///     if let Some(value) = equal_filter.equal_any {
///         query = query.filter(location_dsl::id.eq_any(value));
///     }
/// }
/// ```
macro_rules! apply_equal_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(equal_filter) = $filter_field {
            if let Some(value) = equal_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = equal_filter.not_equal_to {
                $query = $query.filter($dsl_field.ne(value));
            }

            if let Some(value) = equal_filter.equal_any {
                $query = $query.filter($dsl_field.eq_any(value));
            }

            if let Some(value) = equal_filter.not_equal_all {
                $query = $query.filter($dsl_field.ne_all(value));
            }

            $query = match equal_filter.is_null {
                Some(true) => $query.filter($dsl_field.is_null()),
                Some(false) => $query.filter($dsl_field.is_not_null()),
                None => $query,
            }
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_simple_string_filter!(query, filter.comment, invoice_dsl::comment)
/// ```
///
/// ```
/// if let Some(string_filter) = filter.comment {
///     if let Some(value) = equal_filter.equal_to {
///         query = query.filterd(invoice_dsl::comment.eq(value));
///     }
///
///     if let Some(value) = equal_filter.like {
///         query = query.filter(invoice_dsl::comment.like(format!("%{}%", value)));
///     }
/// }
/// ```
#[cfg(not(feature = "postgres"))]
macro_rules! apply_simple_string_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(string_filter) = $filter_field {
            if let Some(value) = string_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = string_filter.like {
                // in sqlite like is case insensitive (but on only works with ASCII chars)
                $query = $query.filter($dsl_field.like(format!("%{}%", value)));
            }
        }
    }};
}
#[cfg(feature = "postgres")]
macro_rules! apply_simple_string_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(string_filter) = $filter_field {
            if let Some(value) = string_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = string_filter.like {
                // Use case insensitive like
                $query = $query.filter($dsl_field.ilike(format!("%{}%", value)));
            }
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_date_time_filter!(query, filter.created_datetime, invoice_dsl::created_datetime)
/// ```
///
/// ```
/// if let Some(date_time_filter) = filter.created_datetime {
///     if let Some(value) = date_time_filter.equal_to {
///         query = query.filterd(invoice_dsl::created_datetime.eq(value));
///     }
///
///     if let Some(value) = date_time_filter.before_or_equal_to {
///         query = query.filterd(invoice_dsl::created_datetime.le(value));
///     }
///
///     if let Some(value) = date_time_filter.after_or_equal_to {
///         query = query.filterd(invoice_dsl::created_datetime.ge(value));
///     }
/// }
/// ```
macro_rules! apply_date_time_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(date_time_filter) = $filter_field {
            if let Some(value) = date_time_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = date_time_filter.before_or_equal_to {
                $query = $query.filter($dsl_field.le(value));
            }

            if let Some(value) = date_time_filter.after_or_equal_to {
                $query = $query.filter($dsl_field.ge(value));
            }

            $query = match date_time_filter.is_null {
                Some(true) => $query.filter($dsl_field.is_null()),
                Some(false) => $query.filter($dsl_field.is_not_null()),
                None => $query,
            }
        }
    }};
}

macro_rules! apply_date_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(date_filter) = $filter_field {
            if let Some(value) = date_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = date_filter.before_or_equal_to {
                $query = $query.filter($dsl_field.le(value));
            }

            if let Some(value) = date_filter.after_or_equal_to {
                $query = $query.filter($dsl_field.ge(value));
            }
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_sort_no_case!(query, sort, location_dsl, name)
/// ```
///
/// ```
/// if sort.desc.unwrap_or(false) {
///     query = query.order(location_dsl::name.desc_no_case());
/// } else {
///     query = query.order(location_dsl::name.asc_no_case());
/// }
/// ```
macro_rules! apply_sort_no_case {
    ($query:ident, $sort:ident, $dsl_field:expr) => {{
        use crate::diesel_extensions::OrderByExtensions;
        if $sort.desc.unwrap_or(false) {
            $query = $query.order($dsl_field.desc_no_case());
        } else {
            $query = $query.order($dsl_field.asc_no_case());
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_sort!(query, sort, location_dsl, name)
/// ```
///
/// ```
/// if sort.desc.unwrap_or(false) {
///     query = query.order(location_dsl::name.desc());
/// } else {
///     query = query.order(location_dsl::name.asc());
/// }
/// ```
macro_rules! apply_sort {
    ($query:ident, $sort:ident, $dsl_field:expr) => {{
        if $sort.desc.unwrap_or(false) {
            $query = $query.order($dsl_field.desc());
        } else {
            $query = $query.order($dsl_field.asc());
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_sort_asc_nulls_last!(query, sort, location_dsl, name)
/// ```
///
/// ```
/// if sort.desc.unwrap_or(false) {
///     query = query.order(location_dsl::name.desc_nulls_first());
/// } else {
///     query = query.order(location_dsl::name.asc_nulls_last());
/// }
/// ```
macro_rules! apply_sort_asc_nulls_last {
    ($query:ident, $sort:ident, $dsl_field:expr) => {{
        use crate::diesel_extensions::OrderByExtensions;
        if $sort.desc.unwrap_or(false) {
            $query = $query.order($dsl_field.desc_nulls_first());
        } else {
            $query = $query.order($dsl_field.asc_nulls_last());
        }
    }};
}

pub(crate) use apply_date_filter;
pub(crate) use apply_date_time_filter;
pub(crate) use apply_equal_filter;
pub(crate) use apply_simple_string_filter;
pub(crate) use apply_sort;
pub(crate) use apply_sort_asc_nulls_last;
pub(crate) use apply_sort_no_case;
