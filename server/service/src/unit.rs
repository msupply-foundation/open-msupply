use crate::record_key::{KeyCase, other_active_with_key};
use repository::{RepositoryError, StorageConnection, UnitRow, UnitRowRepository};

#[derive(Debug, PartialEq)]
pub enum UpsertUnitError {
    NameRequired,
    /// Another active unit has the name, which would make lookups by name ambiguous.
    DuplicateName {
        other_id: String,
    },
}

/// Adds or updates one unit, which `unit_errors` has passed.
pub fn upsert_unit_unchecked(
    connection: &StorageConnection,
    unit: &UnitRow,
) -> Result<(), RepositoryError> {
    UnitRowRepository::new(connection).upsert_one(unit)
}

/// Every rule `unit` breaks.
pub fn unit_errors(
    connection: &StorageConnection,
    unit: &UnitRow,
) -> Result<Vec<UpsertUnitError>, RepositoryError> {
    let mut errors = Vec::new();
    if unit.name.trim().is_empty() {
        errors.push(UpsertUnitError::NameRequired);
    }

    let repo = UnitRowRepository::new(connection);
    let saved = repo.find_one_by_id(&unit.id)?;
    if let Some(other_id) = other_active_with_key(
        saved.as_ref(),
        unit,
        KeyCase::Any,
        |name| repo.find_by_trimmed_name_any_case(name),
        |unit| &unit.id,
        |unit| &unit.name,
        |unit| unit.is_active,
    )? {
        errors.push(UpsertUnitError::DuplicateName { other_id });
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn save(connection: &StorageConnection, unit: &UnitRow) -> Result<(), Vec<UpsertUnitError>> {
        save_checked(unit_errors(connection, unit), || {
            upsert_unit_unchecked(connection, unit)
        })
    }

    fn unit(id: &str, name: &str, is_active: bool) -> UnitRow {
        UnitRow {
            id: id.to_string(),
            name: name.to_string(),
            description: None,
            index: 1,
            is_active,
        }
    }

    fn ids_named(connection: &StorageConnection, name: &str) -> Vec<String> {
        UnitRowRepository::new(connection)
            .find_by_trimmed_name_any_case(name)
            .unwrap()
            .into_iter()
            .map(|unit| unit.id)
            .collect()
    }

    #[actix_rt::test]
    async fn a_renamed_unit_is_found_by_its_new_name() {
        let (_, connection, _, _) =
            setup_all("upsert_unit_rename_lookup", MockDataInserts::none()).await;
        let repo = UnitRowRepository::new(&connection);
        repo.upsert_one(&unit("a", "Tab", true)).unwrap();
        repo.upsert_one(&unit("b", "Tab", true)).unwrap();

        save(&connection, &unit("a", "Tablet", true)).unwrap();
        assert_eq!(ids_named(&connection, "Tab"), vec!["b"]);
        assert_eq!(ids_named(&connection, "Tablet"), vec!["a"]);
        // Inactive units are found too.
        save(&connection, &unit("a", "Tablet", false)).unwrap();
        assert_eq!(ids_named(&connection, "Tablet"), vec!["a"]);
    }

    #[actix_rt::test]
    async fn name_is_required() {
        let (_, connection, _, _) =
            setup_all("upsert_unit_name_required", MockDataInserts::none()).await;

        assert_eq!(
            save(&connection, &unit("a", "  ", true)),
            Err(vec![UpsertUnitError::NameRequired])
        );
    }

    #[actix_rt::test]
    async fn an_active_unit_cannot_take_another_active_units_name() {
        let (_, connection, _, _) =
            setup_all("upsert_unit_duplicate_name", MockDataInserts::none()).await;
        let duplicate = || {
            Err(vec![UpsertUnitError::DuplicateName {
                other_id: "tab".to_string(),
            }])
        };
        save(&connection, &unit("tab", "Tab", true)).unwrap();
        save(&connection, &unit("vial", "Vial", true)).unwrap();

        // Added, renamed or made active with the name.
        assert_eq!(save(&connection, &unit("new", "Tab", true)), duplicate());
        assert_eq!(save(&connection, &unit("vial", "Tab", true)), duplicate());
        save(&connection, &unit("old", "Tab", false)).unwrap();
        assert_eq!(save(&connection, &unit("old", "Tab", true)), duplicate());
        // Surrounding spaces and letter case don't, as in lookups.
        assert_eq!(save(&connection, &unit("new", " Tab ", true)), duplicate());
        assert_eq!(save(&connection, &unit("new", "TAB", true)), duplicate());
        // A unit can change its own name's letter case.
        save(&connection, &unit("tab", "TAB", true)).unwrap();
    }

    #[actix_rt::test]
    async fn a_name_is_found_whatever_spaces_or_letter_case() {
        let (_, connection, _, _) =
            setup_all("upsert_unit_padded_lookup", MockDataInserts::none()).await;
        UnitRowRepository::new(&connection)
            .upsert_one(&unit("a", "Tab ", true))
            .unwrap();
        assert_eq!(ids_named(&connection, "Tab"), vec!["a"]);
        assert_eq!(ids_named(&connection, " Tab"), vec!["a"]);
        // So is letter case.
        assert_eq!(ids_named(&connection, "tAB"), vec!["a"]);
    }

    #[actix_rt::test]
    async fn units_that_already_share_a_name_can_still_be_edited() {
        let (_, connection, _, _) =
            setup_all("upsert_unit_existing_duplicates", MockDataInserts::none()).await;
        let repo = UnitRowRepository::new(&connection);
        repo.upsert_one(&unit("a", "Tab", true)).unwrap();
        repo.upsert_one(&unit("b", "Tab", true)).unwrap();

        let edited = UnitRow {
            index: 5,
            ..unit("b", "Tab", true)
        };
        save(&connection, &edited).unwrap();
        assert_eq!(repo.find_one_by_id("b").unwrap(), Some(edited));
        save(&connection, &unit("b", "Tab", false)).unwrap();
    }
}
