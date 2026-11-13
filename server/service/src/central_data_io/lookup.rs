#[derive(Debug, PartialEq)]
pub enum LookupError {
    NotFound,
    Ambiguous,
    Conflict { resolved: String, provided: String },
}

impl LookupError {
    pub fn message(&self, code: &str) -> String {
        match self {
            LookupError::NotFound => "referenced record not found".to_string(),
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
