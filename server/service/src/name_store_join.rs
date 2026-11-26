use repository::{
    EqualFilter, NameRowRepository, NameStoreJoinFilter, NameStoreJoinRepository, NameStoreJoinRow,
    RepositoryError, StorageConnection,
};

#[derive(Debug, PartialEq)]
pub enum UpsertNameStoreJoinError {
    NameDeleted,
    /// Another join already lets the store see the name.
    DuplicateJoin {
        other_id: String,
    },
}

/// Lets a store see a name. `row` has passed `name_store_join_errors`.
pub fn upsert_name_store_join_unchecked(
    connection: &StorageConnection,
    row: &NameStoreJoinRow,
) -> Result<(), RepositoryError> {
    NameStoreJoinRepository::new(connection).upsert_one(row)
}

/// Removes the join, so the store no longer sees the name.
pub fn delete_name_store_join(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), RepositoryError> {
    NameStoreJoinRepository::new(connection).delete(id)
}

/// Every rule `row` breaks. Only what the save changes is checked, so a saved join that no longer
/// passes, such as one to a deleted name, stays editable. The caller finds its store and name, so a
/// missing one isn't checked here.
pub fn name_store_join_errors(
    connection: &StorageConnection,
    saved: Option<&NameStoreJoinRow>,
    row: &NameStoreJoinRow,
) -> Result<Vec<UpsertNameStoreJoinError>, RepositoryError> {
    let mut errors = Vec::new();
    let store_changes = saved.is_none_or(|saved| saved.store_id != row.store_id);
    let name_changes = saved.is_none_or(|saved| saved.name_id != row.name_id);
    if name_changes
        && let Some(name) = NameRowRepository::new(connection).find_one_by_id(&row.name_id)?
        && name.deleted_datetime.is_some()
    {
        errors.push(UpsertNameStoreJoinError::NameDeleted);
    }
    if (store_changes || name_changes)
        && let Some(other) = NameStoreJoinRepository::new(connection)
            .query_by_filter(
                NameStoreJoinFilter::new()
                    .store_id(EqualFilter::equal_to(row.store_id.clone()))
                    .name_id(EqualFilter::equal_to(row.name_id.clone())),
            )?
            .into_iter()
            .find(|other| other.name_store_join.id != row.id)
    {
        errors.push(UpsertNameStoreJoinError::DuplicateJoin {
            other_id: other.name_store_join.id,
        });
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use chrono::NaiveDate;
    use repository::{
        NameRow, NameRowType, StoreRow, StoreRowRepository, mock::MockDataInserts,
        test_db::setup_all,
    };

    fn save(
        connection: &StorageConnection,
        row: &NameStoreJoinRow,
    ) -> Result<(), Vec<UpsertNameStoreJoinError>> {
        let saved = NameStoreJoinRepository::new(connection)
            .find_one_by_id(&row.id)
            .unwrap();
        save_checked(
            name_store_join_errors(connection, saved.as_ref(), row),
            || upsert_name_store_join_unchecked(connection, row),
        )
    }

    fn join(id: &str, name_id: &str) -> NameStoreJoinRow {
        NameStoreJoinRow {
            id: id.to_string(),
            store_id: "store".to_string(),
            name_id: name_id.to_string(),
            name_is_customer: true,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn a_store_sees_a_live_name_through_one_join() {
        let (_, connection, _, _) =
            setup_all("upsert_name_store_join", MockDataInserts::none()).await;
        let names = NameRowRepository::new(&connection);
        for (id, deleted) in [("store_name", false), ("clinic", false), ("closed", true)] {
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
        StoreRowRepository::new(&connection)
            .upsert_one(&StoreRow {
                id: "store".to_string(),
                name_id: "store_name".to_string(),
                ..Default::default()
            })
            .unwrap();

        save(&connection, &join("a", "clinic")).unwrap();
        assert_eq!(
            save(&connection, &join("b", "clinic")),
            Err(vec![UpsertNameStoreJoinError::DuplicateJoin {
                other_id: "a".to_string()
            }])
        );
        assert_eq!(
            save(&connection, &join("b", "closed")),
            Err(vec![UpsertNameStoreJoinError::NameDeleted])
        );

        // A join whose name is deleted later stays editable.
        NameStoreJoinRepository::new(&connection)
            .upsert_one(&join("c", "closed"))
            .unwrap();
        save(
            &connection,
            &NameStoreJoinRow {
                name_is_supplier: true,
                ..join("c", "closed")
            },
        )
        .unwrap();

        delete_name_store_join(&connection, "a").unwrap();
        assert_eq!(
            NameStoreJoinRepository::new(&connection)
                .find_one_by_id("a")
                .unwrap(),
            None
        );
    }
}
