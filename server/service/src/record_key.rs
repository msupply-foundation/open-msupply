use repository::{RepositoryError, trim_spaces};

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

/// As [`other_with_key`], among active records only, so an inactive one doesn't hold on to its
/// key. An inactive `record` clashes with none.
pub(crate) fn other_active_with_key<R>(
    saved: Option<&R>,
    record: &R,
    case: KeyCase,
    find_by_key: impl FnOnce(&str) -> Result<Vec<R>, RepositoryError>,
    id: impl Fn(&R) -> &str,
    key: impl Fn(&R) -> &str,
    is_active: impl Fn(&R) -> bool,
) -> Result<Option<String>, RepositoryError> {
    if !is_active(record) {
        return Ok(None);
    }
    other_with_key(
        saved.filter(|saved| is_active(saved)).map(&key),
        id(record),
        key(record),
        case,
        |key| Ok(find_by_key(key)?.into_iter().filter(&is_active).collect()),
        &id,
    )
}
