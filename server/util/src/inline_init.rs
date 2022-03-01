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
    F: FnOnce(&mut T) -> (),
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
///     description: "".to_string(),
/// };
///
/// assert_eq!(
///     inline_edit(&record, |input: &mut Check| input.id = "id2".to_string()),
///     Check {
///        id: "id2".to_string(),
///        description: "".to_string()
///     }
/// );
pub fn inline_edit<T, F>(record: &T, f: F) -> T
where
    T: Clone,
    F: FnOnce(&mut T) -> (),
{
    let mut t = record.clone();
    f(&mut t);
    t
}

pub struct Defaults;

impl Defaults {
    pub fn naive_date_time() -> NaiveDateTime {
        NaiveDate::from_ymd(2022, 1, 22).and_hms(15, 16, 0)
    }
}
