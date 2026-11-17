use super::cells::{Row, RowError};
use repository::{
    ItemRow, ItemRowRepository, LocationTypeRow, LocationTypeRowRepository, RepositoryError,
    UnitRow, UnitRowRepository, UserAccountRow, UserAccountRowRepository,
};

/// A table a row finds records in, by id or by a lookup key such as a code or name.
pub trait KeyedTable {
    type Record;
    fn id(record: &Self::Record) -> &str;
    fn key(record: &Self::Record) -> &str;
    fn find_by_id(&self, id: &str) -> Result<Option<Self::Record>, RepositoryError>;
    /// Spaces around either key don't count. Letter case does, unless the table says otherwise.
    fn find_by_key(&self, key: &str) -> Result<Vec<Self::Record>, RepositoryError>;
}

/// Looked up by name.
impl KeyedTable for UnitRowRepository<'_> {
    type Record = UnitRow;
    fn id(unit: &UnitRow) -> &str {
        &unit.id
    }
    fn key(unit: &UnitRow) -> &str {
        &unit.name
    }
    fn find_by_id(&self, id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, name: &str) -> Result<Vec<UnitRow>, RepositoryError> {
        self.find_by_trimmed_name(name)
    }
}

/// Looked up by code.
impl KeyedTable for LocationTypeRowRepository<'_> {
    type Record = LocationTypeRow;
    fn id(location_type: &LocationTypeRow) -> &str {
        &location_type.id
    }
    fn key(location_type: &LocationTypeRow) -> &str {
        &location_type.code
    }
    fn find_by_id(&self, id: &str) -> Result<Option<LocationTypeRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<LocationTypeRow>, RepositoryError> {
        self.find_by_trimmed_code(code)
    }
}

/// Looked up by code. Each item comes with an empty `legacy_record`, as it's most of an item's
/// size and the import never changes it.
impl KeyedTable for ItemRowRepository<'_> {
    type Record = ItemRow;
    fn id(item: &ItemRow) -> &str {
        &item.id
    }
    fn key(item: &ItemRow) -> &str {
        &item.code
    }
    fn find_by_id(&self, id: &str) -> Result<Option<ItemRow>, RepositoryError> {
        self.find_one_by_id_without_legacy_record(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<ItemRow>, RepositoryError> {
        self.find_by_trimmed_code_without_legacy_record(code)
    }
}

/// Looked up by username, in any letter case, as login matches it. Deleted users are found too,
/// so a row can restore one.
impl KeyedTable for UserAccountRowRepository<'_> {
    type Record = UserAccountRow;
    fn id(user: &UserAccountRow) -> &str {
        &user.id
    }
    fn key(user: &UserAccountRow) -> &str {
        &user.username
    }
    fn find_by_id(&self, id: &str) -> Result<Option<UserAccountRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, username: &str) -> Result<Vec<UserAccountRow>, RepositoryError> {
        self.find_by_trimmed_username_any_case(username)
    }
}

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

/// The saved record a row changes, by id, else by its lookup key in `column`. `Ok(None)` for a
/// row that adds one. `name` names the saved record in a conflict.
pub fn find_record<T: KeyedTable>(
    table: &T,
    row: &Row,
    column: &str,
    id: Option<&str>,
    key: Option<&str>,
    name: impl Fn(&T::Record) -> &str,
) -> Result<Result<Option<T::Record>, RowError>, RepositoryError> {
    let conflict = |saved: &T::Record, id: &str, key: &str| {
        row.error(
            column,
            record_conflict(column, name(saved), T::key(saved), T::id(saved), key, id),
        )
    };
    let Some(key) = key else {
        return Ok(Ok(match id {
            Some(id) => table.find_by_id(id)?,
            None => None,
        }));
    };
    let by_key = table.find_by_key(key)?;
    Ok(match id {
        Some(id) => match table.find_by_id(id)? {
            // The key must find the saved record, so keys compare as the table compares them.
            Some(saved) if !by_key.iter().any(|other| T::id(other) == id) => {
                Err(conflict(&saved, id, key))
            }
            Some(saved) => Ok(Some(saved)),
            // A new id beside a saved key is a copied row with one column edited.
            None => match by_key.first() {
                Some(saved) => Err(conflict(saved, id, key)),
                None => Ok(None),
            },
        },
        None if by_key.len() > 1 => Err(row.error(column, LookupError::Ambiguous.message(key))),
        None => Ok(by_key.into_iter().next()),
    })
}

/// A reference to another table's record, given by a code column, an id column or both. `None`
/// when the sheet has neither column, so the saved reference is kept; `Some(None)` clears it.
/// `narrow` picks among the records a code alone matches, as an id settles which one is meant.
pub fn find_reference<T: KeyedTable>(
    table: &T,
    row: &Row,
    code_column: &str,
    id_column: &str,
    narrow: impl Fn(Vec<T::Record>) -> Vec<T::Record>,
) -> Result<Result<Option<Option<String>>, RowError>, RepositoryError> {
    if !row.has(code_column) && !row.has(id_column) {
        return Ok(Ok(None));
    }
    let id = row.text(id_column);
    let code = row.text(code_column);
    let id_exists = match id.as_deref() {
        Some(id) => table.find_by_id(id)?.is_some(),
        None => false,
    };
    let code_matches: Option<Vec<String>> = match code.as_deref() {
        Some(code) => {
            let matches = table.find_by_key(code)?;
            let matches = if id.is_some() {
                matches
            } else {
                narrow(matches)
            };
            Some(
                matches
                    .iter()
                    .map(|record| T::id(record).to_string())
                    .collect(),
            )
        }
        None => None,
    };
    Ok(resolve(id.as_deref(), id_exists, code_matches.as_deref())
        .map(Some)
        .map_err(|error| {
            let column = if id.is_some() && !id_exists {
                id_column
            } else {
                code_column
            };
            row.error(column, error.message(code.as_deref().unwrap_or_default()))
        }))
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
