use repository::{
    EqualFilter, NameRowRepository, NameStoreJoinFilter, NameStoreJoinRepository, NameStoreJoinRow,
    RepositoryError, StorageConnection, StoreRowRepository,
};

#[derive(Debug, PartialEq)]
pub enum UpsertNameStoreJoinError {
    StoreNotFound,
    NameNotFound,
    NameDeleted,
    /// Another join already lets the store see the name.
    DuplicateJoin {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertNameStoreJoinError {
    fn from(error: RepositoryError) -> Self {
        UpsertNameStoreJoinError::DatabaseError(error)
    }
}

/// Lets a store see a name. Joins the caller's transaction, so an import's earlier rows count.
pub fn upsert_name_store_join(
    connection: &StorageConnection,
    row: &NameStoreJoinRow,
) -> Result<(), UpsertNameStoreJoinError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertNameStoreJoinError> {
            let repo = NameStoreJoinRepository::new(connection);
            let saved = repo.find_one_by_id(&row.id)?;
            validate(connection, saved.as_ref(), row)?;
            repo.upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Removes the join, so the store no longer sees the name.
pub fn delete_name_store_join(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), RepositoryError> {
    NameStoreJoinRepository::new(connection).delete(id)
}

/// Only what the save changes is checked, so a saved join that no longer passes, such as one to a
/// deleted name, stays editable.
fn validate(
    connection: &StorageConnection,
    saved: Option<&NameStoreJoinRow>,
    row: &NameStoreJoinRow,
) -> Result<(), UpsertNameStoreJoinError> {
    let store_changes = saved.is_none_or(|saved| saved.store_id != row.store_id);
    let name_changes = saved.is_none_or(|saved| saved.name_id != row.name_id);
    if store_changes
        && StoreRowRepository::new(connection)
            .find_one_by_id(&row.store_id)?
            .is_none()
    {
        return Err(UpsertNameStoreJoinError::StoreNotFound);
    }
    if name_changes {
        let name = NameRowRepository::new(connection)
            .find_one_by_id(&row.name_id)?
            .ok_or(UpsertNameStoreJoinError::NameNotFound)?;
        if name.deleted_datetime.is_some() {
            return Err(UpsertNameStoreJoinError::NameDeleted);
        }
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
        return Err(UpsertNameStoreJoinError::DuplicateJoin {
            other_id: other.name_store_join.id,
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use repository::{NameRow, NameRowType, StoreRow, mock::MockDataInserts, test_db::setup_all};

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

        upsert_name_store_join(&connection, &join("a", "clinic")).unwrap();
        assert_eq!(
            upsert_name_store_join(&connection, &join("b", "clinic")),
            Err(UpsertNameStoreJoinError::DuplicateJoin {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            upsert_name_store_join(&connection, &join("b", "closed")),
            Err(UpsertNameStoreJoinError::NameDeleted)
        );
        assert_eq!(
            upsert_name_store_join(&connection, &join("b", "nobody")),
            Err(UpsertNameStoreJoinError::NameNotFound)
        );
        assert_eq!(
            upsert_name_store_join(
                &connection,
                &NameStoreJoinRow {
                    store_id: "no_store".to_string(),
                    ..join("b", "clinic")
                }
            ),
            Err(UpsertNameStoreJoinError::StoreNotFound)
        );

        // A join whose name is deleted later stays editable.
        NameStoreJoinRepository::new(&connection)
            .upsert_one(&join("c", "closed"))
            .unwrap();
        upsert_name_store_join(
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
