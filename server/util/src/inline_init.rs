use chrono::{NaiveDate, NaiveDateTime};

/// ```
/// # use util::inline_init;
///
///  #[derive(Default, Debug, PartialEq)]
/// struct Check {
///   id: String,
///   description: String
/// }
///
/// assert_eq!(
///     inline_init(|input: &mut Check| input.id = "id1".to_string()),
///     Check {
///         id: "id1".to_string(),
///         description: "".to_string()
///     }
/// );
/// ```
pub fn inline_init<T, F>(f: F) -> T
where
    T: Default,
    F: FnOnce(&mut T),
{
    let mut t = T::default();
    f(&mut t);
    t
}

/// ```
/// # use util::inline_edit;
///
/// #[derive(Clone, Debug, PartialEq)]
/// struct Check {
///     id: String,
///     description: String,
/// }
///
/// let record = Check {
///     id: "id1".to_string(),
///     description: "desc".to_string(),
/// };
///
/// let new_id = Some("new_id".to_string());
///
/// assert_eq!(
///     inline_edit(&record, |mut input: Check| {
///       input.id = new_id.unwrap_or(input.id);
///       input
///     }),
///     Check {
///        id: "new_id".to_string(),
///        description: "desc".to_string()
///     }
/// );
/// ```
pub fn inline_edit<T, F>(record: &T, f: F) -> T
where
    T: Clone,
    F: FnOnce(T) -> T,
{
    f(record.clone())
}

pub struct Defaults;

impl Defaults {
    pub fn naive_date_time() -> NaiveDateTime {
        Defaults::naive_date().and_hms_opt(15, 16, 0).unwrap()
    }

    pub fn naive_date() -> NaiveDate {
        NaiveDate::from_ymd_opt(2020, 1, 22).unwrap()
    }
}
