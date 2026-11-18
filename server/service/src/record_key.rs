use repository::{RepositoryError, trim_spaces};

/// The active records among those a name matches, or the inactive ones when none is active, so an
/// old inactive namesake doesn't make the name ambiguous.
pub(crate) fn active_first_by<R>(records: Vec<R>, is_active: impl Fn(&R) -> bool) -> Vec<R> {
    let (active, inactive): (Vec<_>, Vec<_>) = records.into_iter().partition(|r| is_active(r));
    if active.is_empty() { inactive } else { active }
}

/// How two keys compare. Spaces around them never count.
#[derive(Clone, Copy)]
pub(crate) enum KeyCase {
    /// Letter case counts, as for codes.
    Exact,
    /// As for unit names.
    Any,
}

/// The id of another record with `key`. Only a save that brings in the clash is checked, so
/// existing duplicates stay editable.
pub(crate) fn other_with_key<R>(
    saved_key: Option<&str>,
    id: &str,
    key: &str,
    case: KeyCase,
    find_by_key: impl FnOnce(&str) -> Result<Vec<R>, RepositoryError>,
    record_id: impl Fn(&R) -> &str,
) -> Result<Option<String>, RepositoryError> {
    let fold = |key: &str| {
        let key = trim_spaces(key);
        match case {
            KeyCase::Exact => key.to_string(),
            KeyCase::Any => key.to_lowercase(),
        }
    };
    if saved_key.is_some_and(|saved| fold(saved) == fold(key)) {
        return Ok(None);
    }
    Ok(find_by_key(key)?
        .iter()
        .map(&record_id)
        .find(|other| *other != id)
        .map(str::to_string))
}
