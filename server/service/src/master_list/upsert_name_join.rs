use repository::{
    MasterListNameJoinRepository, MasterListNameJoinRow, MasterListRowRepository,
    NameRowRepository, RepositoryError, StorageConnection,
};
use util::constants::MISSING_PROGRAM;

#[derive(Debug, PartialEq)]
pub enum UpsertMasterListNameJoinError {
    MasterListNotFound,
    /// The `MISSING_PROGRAM` placeholder, which is given to no name.
    Protected,
    NameNotFound,
    NameDeleted,
    /// Another join already gives the master list to the name.
    DuplicateJoin {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertMasterListNameJoinError {
    fn from(error: RepositoryError) -> Self {
        UpsertMasterListNameJoinError::DatabaseError(error)
    }
}

/// Gives a master list to a name. Joins the caller's transaction, so an import's earlier rows
/// count.
pub fn upsert_master_list_name_join(
    connection: &StorageConnection,
    row: &MasterListNameJoinRow,
) -> Result<(), UpsertMasterListNameJoinError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertMasterListNameJoinError> {
            let repo = MasterListNameJoinRepository::new(connection);
            let saved = repo.find_one_by_id(&row.id)?;
            validate(connection, saved.as_ref(), row)?;
            repo.upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
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

/// Only what the save changes is checked, so a saved join that no longer passes, such as one to a
/// deleted name, stays editable.
fn validate(
    connection: &StorageConnection,
    saved: Option<&MasterListNameJoinRow>,
    row: &MasterListNameJoinRow,
) -> Result<(), UpsertMasterListNameJoinError> {
    let master_list_changes = saved.is_none_or(|saved| saved.master_list_id != row.master_list_id);
    let name_changes = saved.is_none_or(|saved| saved.name_id != row.name_id);
    if master_list_changes {
        if row.master_list_id == MISSING_PROGRAM {
            return Err(UpsertMasterListNameJoinError::Protected);
        }
        if !MasterListRowRepository::new(connection).check_exists_by_id(&row.master_list_id)? {
            return Err(UpsertMasterListNameJoinError::MasterListNotFound);
        }
    }
    if name_changes {
        let name = NameRowRepository::new(connection)
            .find_one_by_id(&row.name_id)?
            .ok_or(UpsertMasterListNameJoinError::NameNotFound)?;
        if name.deleted_datetime.is_some() {
            return Err(UpsertMasterListNameJoinError::NameDeleted);
        }
    }
    if (master_list_changes || name_changes)
        && let Some(other) =
            find_master_list_name_joins(connection, &row.master_list_id, &row.name_id)?
                .into_iter()
                .find(|other| other.id != row.id)
    {
        return Err(UpsertMasterListNameJoinError::DuplicateJoin { other_id: other.id });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use repository::{
        MasterListRow, NameRow, NameRowType, mock::MockDataInserts, test_db::setup_all,
    };

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

        upsert_master_list_name_join(&connection, &join("a", "clinic")).unwrap();
        assert_eq!(
            upsert_master_list_name_join(&connection, &join("b", "clinic")),
            Err(UpsertMasterListNameJoinError::DuplicateJoin {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            upsert_master_list_name_join(&connection, &join("b", "closed")),
            Err(UpsertMasterListNameJoinError::NameDeleted)
        );
        assert_eq!(
            upsert_master_list_name_join(&connection, &join("b", "nobody")),
            Err(UpsertMasterListNameJoinError::NameNotFound)
        );
        assert_eq!(
            upsert_master_list_name_join(
                &connection,
                &MasterListNameJoinRow {
                    master_list_id: "no_list".to_string(),
                    ..join("b", "hospital")
                }
            ),
            Err(UpsertMasterListNameJoinError::MasterListNotFound)
        );
        assert_eq!(
            upsert_master_list_name_join(
                &connection,
                &MasterListNameJoinRow {
                    master_list_id: MISSING_PROGRAM.to_string(),
                    ..join("b", "hospital")
                }
            ),
            Err(UpsertMasterListNameJoinError::Protected)
        );

        // A join whose name is deleted later stays editable.
        MasterListNameJoinRepository::new(&connection)
            .upsert_one(&join("c", "closed"))
            .unwrap();
        upsert_master_list_name_join(&connection, &join("c", "closed")).unwrap();

        // Moving a join onto the name another join has is a duplicate.
        upsert_master_list_name_join(&connection, &join("b", "hospital")).unwrap();
        assert_eq!(
            upsert_master_list_name_join(&connection, &join("b", "clinic")),
            Err(UpsertMasterListNameJoinError::DuplicateJoin {
                other_id: "a".to_string()
            })
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
