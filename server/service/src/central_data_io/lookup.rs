use super::cells::{Row, RowError};
use crate::keyed_lookup::{Keyed, KeyedLookup};

#[derive(Debug, PartialEq)]
pub enum LookupError {
    NotFound,
    Ambiguous,
    Conflict { resolved: String, provided: String },
}

pub const NOT_FOUND: &str = "referenced record not found";

impl LookupError {
    pub fn message(&self, code: &str) -> String {
        match self {
            LookupError::NotFound => NOT_FOUND.to_string(),
            LookupError::Ambiguous => "ambiguous reference, please provide id instead".to_string(),
            LookupError::Conflict { resolved, provided } => format!(
                "code and id conflict: {code} resolves to {resolved} but id column contains {provided}"
            ),
        }
    }
}

/// For a row whose id and lookup key don't find the same saved record. `column` is the key's.
pub fn record_conflict(
    column: &str,
    record: &str,
    saved_key: &str,
    saved_id: &str,
    key: &str,
    id: &str,
) -> String {
    format!(
        "{column} and id conflict: {record} has {column} {saved_key} and id {saved_id}, but this row has {column} {key} and id {id}"
    )
}

/// The saved record a row changes, by id, else by its lookup key in `column`. `None` for a row
/// that adds one. `name` names the saved record in a conflict.
pub fn find_record<R: Keyed + Clone>(
    lookup: &KeyedLookup<R>,
    row: &Row,
    column: &str,
    id: Option<&str>,
    key: Option<&str>,
    name: impl Fn(&R) -> &str,
) -> Result<Option<R>, RowError> {
    let conflict = |saved: &R, id: &str, key: &str| {
        row.error(
            column,
            record_conflict(column, name(saved), saved.key(), saved.id(), key, id),
        )
    };
    let Some(key) = key else {
        return Ok(id.and_then(|id| lookup.by_id(id)).cloned());
    };
    let by_key = lookup.by_key(key);
    match id {
        Some(id) => match lookup.by_id(id) {
            Some(saved) if saved.key().trim() != key => Err(conflict(saved, id, key)),
            Some(saved) => Ok(Some(saved.clone())),
            // A new id beside a saved key is a copied row with one column edited.
            None => match by_key.first() {
                Some(saved) => Err(conflict(saved, id, key)),
                None => Ok(None),
            },
        },
        None => match by_key.as_slice() {
            [] => Ok(None),
            [saved] => Ok(Some((*saved).clone())),
            _ => Err(row.error(column, LookupError::Ambiguous.message(key))),
        },
    }
}

/// A reference to another table's record, given by a code column, an id column or both. `None`
/// when the sheet has neither column, so the saved reference is kept; `Some(None)` clears it.
/// `narrow` picks among the records a code alone matches, as an id settles which one is meant.
pub fn find_reference<'a, R: Keyed>(
    lookup: &'a KeyedLookup<R>,
    row: &Row,
    code_column: &str,
    id_column: &str,
    narrow: impl Fn(Vec<&'a R>) -> Vec<&'a R>,
) -> Result<Option<Option<String>>, RowError> {
    if !row.has(code_column) && !row.has(id_column) {
        return Ok(None);
    }
    let id = row.text(id_column);
    let code = row.text(code_column);
    let id_exists = id.as_deref().is_some_and(|id| lookup.by_id(id).is_some());
    let code_matches: Option<Vec<String>> = code.as_deref().map(|code| {
        let matches = lookup.by_key(code);
        let matches = if id.is_some() {
            matches
        } else {
            narrow(matches)
        };
        matches
            .into_iter()
            .map(|record| record.id().to_string())
            .collect()
    });
    resolve(id.as_deref(), id_exists, code_matches.as_deref())
        .map(Some)
        .map_err(|error| {
            let column = if id.is_some() && !id_exists {
                id_column
            } else {
                code_column
            };
            row.error(column, error.message(code.as_deref().unwrap_or_default()))
        })
}

/// `code_matches` holds the ids the code matched, `None` when no code was given. Given both, id
/// and code must agree.
pub fn resolve(
    id: Option<&str>,
    id_exists: bool,
    code_matches: Option<&[String]>,
) -> Result<Option<String>, LookupError> {
    match (id, code_matches) {
        (None, None) => Ok(None),
        (Some(_), _) if !id_exists => Err(LookupError::NotFound),
        (Some(id), None) => Ok(Some(id.to_string())),
        (Some(id), Some(matches)) if matches.iter().any(|matched| matched == id) => {
            Ok(Some(id.to_string()))
        }
        (_, Some([])) => Err(LookupError::NotFound),
        (Some(id), Some(matches)) => Err(LookupError::Conflict {
            resolved: matches.join(", "),
            provided: id.to_string(),
        }),
        (None, Some([matched])) => Ok(Some(matched.clone())),
        (None, Some(_)) => Err(LookupError::Ambiguous),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(ids: &[&str]) -> Vec<String> {
        ids.iter().map(|id| id.to_string()).collect()
    }

    #[test]
    fn nothing_given_resolves_to_nothing() {
        assert_eq!(resolve(None, false, None), Ok(None));
    }

    // covers: OMS-REG-CDIO-01.24

    #[test]
    fn by_code() {
        assert_eq!(
            resolve(None, false, Some(&ids(&["a"]))),
            Ok(Some("a".into()))
        );
        assert_eq!(resolve(None, false, Some(&[])), Err(LookupError::NotFound));
        assert_eq!(
            resolve(None, false, Some(&ids(&["a", "b"]))),
            Err(LookupError::Ambiguous)
        );
    }

    #[test]
    fn by_id() {
        assert_eq!(resolve(Some("a"), true, None), Ok(Some("a".into())));
        assert_eq!(resolve(Some("a"), false, None), Err(LookupError::NotFound));
    }

    #[test]
    fn id_settles_an_ambiguous_code_it_agrees_with() {
        assert_eq!(
            resolve(Some("b"), true, Some(&ids(&["a", "b"]))),
            Ok(Some("b".into()))
        );
    }

    // covers: OMS-REG-CDIO-01.23

    #[test]
    fn code_and_id_that_disagree_conflict() {
        let error = resolve(Some("b"), true, Some(&ids(&["a"]))).unwrap_err();
        assert_eq!(
            error.message("TAB"),
            "code and id conflict: TAB resolves to a but id column contains b"
        );
        // A code that finds nothing is an error even when the id is valid.
        assert_eq!(
            resolve(Some("b"), true, Some(&[])),
            Err(LookupError::NotFound)
        );
    }
}
