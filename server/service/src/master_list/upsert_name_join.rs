use repository::{
    MasterListNameJoinRepository, MasterListNameJoinRow, NameRowRepository, RepositoryError,
    StorageConnection,
};
use util::constants::MISSING_PROGRAM;

#[derive(Debug, PartialEq)]
pub enum UpsertMasterListNameJoinError {
    /// The `MISSING_PROGRAM` placeholder, which is given to no name.
    Protected,
    NameDeleted,
    /// Another join already gives the master list to the name.
    DuplicateJoin {
        other_id: String,
    },
}

/// Gives a master list to a name. `row` has passed `master_list_name_join_errors`.
pub fn upsert_master_list_name_join_unchecked(
    connection: &StorageConnection,
    row: &MasterListNameJoinRow,
) -> Result<(), RepositoryError> {
    MasterListNameJoinRepository::new(connection).upsert_one(row)
}

/// Takes the master list away from the name.
pub fn delete_master_list_name_join(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), RepositoryError> {
    MasterListNameJoinRepository::new(connection).delete(id)
}

/// The joins that give the master list to the name, in id order: one, unless legacy mSupply sent
/// more or two merged names had the list.
pub fn find_master_list_name_joins(
    connection: &StorageConnection,
    master_list_id: &str,
    name_id: &str,
) -> Result<Vec<MasterListNameJoinRow>, RepositoryError> {
    MasterListNameJoinRepository::new(connection)
        .find_by_master_list_and_name(master_list_id, name_id)
}

/// Every rule `row` breaks. Only what the save changes is checked, so a saved join that no longer
/// passes, such as one to a deleted name, stays editable. The caller finds its master list and
/// name, so a missing one isn't checked here.
pub fn master_list_name_join_errors(
    connection: &StorageConnection,
    saved: Option<&MasterListNameJoinRow>,
    row: &MasterListNameJoinRow,
) -> Result<Vec<UpsertMasterListNameJoinError>, RepositoryError> {
    let mut errors = Vec::new();
    let master_list_changes = saved.is_none_or(|saved| saved.master_list_id != row.master_list_id);
    let name_changes = saved.is_none_or(|saved| saved.name_id != row.name_id);
    if master_list_changes && row.master_list_id == MISSING_PROGRAM {
        errors.push(UpsertMasterListNameJoinError::Protected);
    }
    if name_changes
        && let Some(name) = NameRowRepository::new(connection).find_one_by_id(&row.name_id)?
        && name.deleted_datetime.is_some()
    {
        errors.push(UpsertMasterListNameJoinError::NameDeleted);
    }
    if (master_list_changes || name_changes)
        && let Some(other) =
            find_master_list_name_joins(connection, &row.master_list_id, &row.name_id)?
                .into_iter()
                .find(|other| other.id != row.id)
    {
        errors.push(UpsertMasterListNameJoinError::DuplicateJoin { other_id: other.id });
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use chrono::NaiveDate;
    use repository::{
        MasterListRow, MasterListRowRepository, NameRow, NameRowType, mock::MockDataInserts,
        test_db::setup_all,
    };

    fn save(
        connection: &StorageConnection,
        row: &MasterListNameJoinRow,
    ) -> Result<(), Vec<UpsertMasterListNameJoinError>> {
        let saved = MasterListNameJoinRepository::new(connection)
            .find_one_by_id(&row.id)
            .unwrap();
        save_checked(
            master_list_name_join_errors(connection, saved.as_ref(), row),
            || upsert_master_list_name_join_unchecked(connection, row),
        )
    }

    fn join(id: &str, name_id: &str) -> MasterListNameJoinRow {
        MasterListNameJoinRow {
            id: id.to_string(),
            master_list_id: "eml".to_string(),
            name_id: name_id.to_string(),
        }
    }

    // covers: OMS-REG-CDIO-01.188, .189

    #[actix_rt::test]
    async fn a_name_has_a_master_list_through_one_join() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_name_join", MockDataInserts::none()).await;
        MasterListRowRepository::new(&connection)
            .upsert_one(&MasterListRow {
                id: "eml".to_string(),
                name: "Essential medicines".to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
        let names = NameRowRepository::new(&connection);
        for (id, deleted) in [("clinic", false), ("hospital", false), ("closed", true)] {
            names
                .upsert_one(&NameRow {
                    id: id.to_string(),
                    code: id.to_uppercase(),
                    r#type: NameRowType::Facility,
                    deleted_datetime: deleted.then(|| {
                        NaiveDate::from_ymd_opt(2025, 1, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap()
                    }),
                    ..Default::default()
                })
                .unwrap();
        }

        save(&connection, &join("a", "clinic")).unwrap();
        assert_eq!(
            save(&connection, &join("b", "clinic")),
            Err(vec![UpsertMasterListNameJoinError::DuplicateJoin {
                other_id: "a".to_string()
            }])
        );
        assert_eq!(
            save(&connection, &join("b", "closed")),
            Err(vec![UpsertMasterListNameJoinError::NameDeleted])
        );
        assert_eq!(
            save(
                &connection,
                &MasterListNameJoinRow {
                    master_list_id: MISSING_PROGRAM.to_string(),
                    ..join("b", "hospital")
                }
            ),
            Err(vec![UpsertMasterListNameJoinError::Protected])
        );

        // A join whose name is deleted later stays editable.
        MasterListNameJoinRepository::new(&connection)
            .upsert_one(&join("c", "closed"))
            .unwrap();
        save(&connection, &join("c", "closed")).unwrap();

        // Moving a join onto the name another join has is a duplicate.
        save(&connection, &join("b", "hospital")).unwrap();
        assert_eq!(
            save(&connection, &join("b", "clinic")),
            Err(vec![UpsertMasterListNameJoinError::DuplicateJoin {
                other_id: "a".to_string()
            }])
        );

        delete_master_list_name_join(&connection, "a").unwrap();
        assert_eq!(
            find_master_list_name_joins(&connection, "eml", "clinic").unwrap(),
            []
        );
        assert_eq!(
            find_master_list_name_joins(&connection, "eml", "hospital").unwrap(),
            [join("b", "hospital")]
        );
    }
}
