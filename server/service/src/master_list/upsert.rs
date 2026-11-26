use crate::record_key::{KeyCase, other_active_with_key, other_with_key};
use repository::{MasterListRow, MasterListRowRepository, RepositoryError, StorageConnection};
use util::constants::MISSING_PROGRAM;

#[derive(Debug, PartialEq)]
pub enum UpsertMasterListError {
    NameRequired,
    /// Another active master list has the name, which would make lookups by name ambiguous.
    DuplicateName {
        other_id: String,
    },
    /// A code is optional, but one that's given is unique.
    DuplicateCode {
        other_id: String,
    },
    /// The `MISSING_PROGRAM` placeholder.
    Protected,
    /// A discount below 0% or above 100%. Checked only when the discount changes, so a saved list
    /// with one stays editable.
    DiscountOutOfRange,
}

/// Adds or updates one master list, which `master_list_errors` has passed.
pub fn upsert_master_list_unchecked(
    connection: &StorageConnection,
    row: &MasterListRow,
) -> Result<(), RepositoryError> {
    MasterListRowRepository::new(connection).upsert_one(row)
}

/// Every rule `row` breaks.
pub fn master_list_errors(
    connection: &StorageConnection,
    row: &MasterListRow,
) -> Result<Vec<UpsertMasterListError>, RepositoryError> {
    let mut errors = Vec::new();
    if row.id == MISSING_PROGRAM {
        errors.push(UpsertMasterListError::Protected);
    }
    if row.name.trim().is_empty() {
        errors.push(UpsertMasterListError::NameRequired);
    }
    let repo = MasterListRowRepository::new(connection);
    let saved = repo.find_one_by_id(&row.id)?;
    let discount_changes = saved
        .as_ref()
        .is_none_or(|saved| saved.discount_percentage != row.discount_percentage);
    if discount_changes
        && row
            .discount_percentage
            .is_some_and(|discount| !(0.0..=100.0).contains(&discount))
    {
        errors.push(UpsertMasterListError::DiscountOutOfRange);
    }
    if let Some(other_id) = other_active_with_key(
        saved.as_ref(),
        row,
        KeyCase::Exact,
        |name| repo.find_by_trimmed_name(name),
        |master_list| &master_list.id,
        |master_list| &master_list.name,
        |master_list| master_list.is_active,
    )? {
        errors.push(UpsertMasterListError::DuplicateName { other_id });
    }
    if let Some(other) = other_with_key(
        saved.as_ref().map(|saved| saved.code.as_str()),
        &row.id,
        &row.code,
        KeyCase::Exact,
        |code| repo.find_by_trimmed_code(code),
        |other| &other.id,
    )? {
        errors.push(UpsertMasterListError::DuplicateCode { other_id: other.id });
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn save(
        connection: &StorageConnection,
        row: &MasterListRow,
    ) -> Result<(), Vec<UpsertMasterListError>> {
        save_checked(master_list_errors(connection, row), || {
            upsert_master_list_unchecked(connection, row)
        })
    }

    fn master_list(id: &str, name: &str) -> MasterListRow {
        MasterListRow {
            id: id.to_string(),
            name: name.to_string(),
            is_active: true,
            ..Default::default()
        }
    }

    fn coded(id: &str, name: &str, code: &str) -> MasterListRow {
        MasterListRow {
            code: code.to_string(),
            ..master_list(id, name)
        }
    }

    // covers: OMS-REG-CDIO-01.122

    #[actix_rt::test]
    async fn a_master_list_cannot_take_another_ones_name() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_duplicate_name", MockDataInserts::none()).await;
        save(&connection, &master_list("a", "Essential")).unwrap();

        // Spaces around a name don't make it another name; letter case does.
        assert_eq!(
            save(&connection, &master_list("b", " Essential ")),
            Err(vec![UpsertMasterListError::DuplicateName {
                other_id: "a".to_string()
            }])
        );
        save(&connection, &master_list("b", "essential")).unwrap();
        assert_eq!(
            save(&connection, &master_list("b", "Essential")),
            Err(vec![UpsertMasterListError::DuplicateName {
                other_id: "a".to_string()
            }])
        );
        assert_eq!(
            save(&connection, &master_list("c", " ")),
            Err(vec![UpsertMasterListError::NameRequired])
        );
    }

    // covers: OMS-REG-CDIO-01.124

    #[actix_rt::test]
    async fn only_active_master_lists_clash_by_name() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_inactive_name", MockDataInserts::none()).await;
        let inactive = |id: &str| MasterListRow {
            is_active: false,
            ..master_list(id, "Essential")
        };
        save(&connection, &inactive("old")).unwrap();
        save(&connection, &master_list("a", "Essential")).unwrap();
        save(&connection, &inactive("older")).unwrap();

        assert_eq!(
            save(&connection, &master_list("old", "Essential")),
            Err(vec![UpsertMasterListError::DuplicateName {
                other_id: "a".to_string()
            }])
        );
    }

    // covers: OMS-REG-CDIO-01.74, .123

    #[actix_rt::test]
    async fn a_code_is_optional_but_unique() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_duplicate_code", MockDataInserts::none()).await;
        save(&connection, &coded("a", "Essential", "EML")).unwrap();

        assert_eq!(
            save(&connection, &coded("b", "Clinic", " EML ")),
            Err(vec![UpsertMasterListError::DuplicateCode {
                other_id: "a".to_string()
            }])
        );
        // Lists without a code don't clash.
        save(&connection, &master_list("b", "Clinic")).unwrap();
        save(&connection, &master_list("c", "Hospital")).unwrap();
    }

    // covers: OMS-REG-CDIO-01.210

    #[actix_rt::test]
    async fn a_discount_is_from_0_to_100_percent() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_discount", MockDataInserts::none()).await;
        let discounted = |id: &str, discount: f64| MasterListRow {
            discount_percentage: Some(discount),
            ..master_list(id, id)
        };

        for discount in [-0.5, 100.5] {
            assert_eq!(
                save(&connection, &discounted("a", discount)),
                Err(vec![UpsertMasterListError::DiscountOutOfRange])
            );
        }
        save(&connection, &discounted("a", 0.0)).unwrap();
        save(&connection, &discounted("b", 100.0)).unwrap();

        // A saved discount out of range stays editable while it's left as it is.
        MasterListRowRepository::new(&connection)
            .upsert_one(&discounted("c", 150.0))
            .unwrap();
        save(
            &connection,
            &MasterListRow {
                description: "Changed".to_string(),
                ..discounted("c", 150.0)
            },
        )
        .unwrap();
        assert_eq!(
            save(&connection, &discounted("c", 120.0)),
            Err(vec![UpsertMasterListError::DiscountOutOfRange])
        );
    }

    // covers: OMS-REG-CDIO-01.125

    #[actix_rt::test]
    async fn the_missing_program_master_list_cannot_be_saved() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_protected", MockDataInserts::none()).await;
        let saved = MasterListRowRepository::new(&connection)
            .find_one_by_id(MISSING_PROGRAM)
            .unwrap();

        assert_eq!(
            save(&connection, &master_list(MISSING_PROGRAM, MISSING_PROGRAM)),
            Err(vec![UpsertMasterListError::Protected])
        );
        assert_eq!(
            MasterListRowRepository::new(&connection)
                .find_one_by_id(MISSING_PROGRAM)
                .unwrap(),
            saved
        );
    }
}
