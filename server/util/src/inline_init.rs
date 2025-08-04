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

pub struct Defaults;

impl Defaults {
    pub fn naive_date_time() -> NaiveDateTime {
        Defaults::naive_date().and_hms_opt(15, 16, 0).unwrap()
    }

    pub fn naive_date() -> NaiveDate {
        NaiveDate::from_ymd_opt(2020, 1, 22).unwrap()
    }
}
