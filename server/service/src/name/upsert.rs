use crate::record_key::{KeyCase, other_active_with_key};
use chrono::Utc;
use repository::{
    CurrencyRowRepository, NameRow, NameRowRepository, NameUser, RepositoryError,
    StorageConnection, StoreRowRepository,
};

#[derive(Debug, PartialEq)]
pub enum UpsertNameError {
    CodeRequired,
    NameRequired,
    /// Another live name of this type has the code, which would make lookups ambiguous.
    DuplicateCode {
        other_id: String,
    },
    /// A system name, which the server relies on.
    Protected,
    /// References and `custom_data` are checked only when the save changes them, as sync can save
    /// a supplying store before it arrives.
    SupplyingStoreNotFound,
    CurrencyNotFound,
    InvalidCustomData,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertNameError {
    fn from(error: RepositoryError) -> Self {
        UpsertNameError::DatabaseError(error)
    }
}

#[derive(Debug, PartialEq)]
pub enum DeleteNameError {
    Protected,
    /// See `NameRowRepository::used_by`.
    InUse(NameUser),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteNameError {
    fn from(error: RepositoryError) -> Self {
        DeleteNameError::DatabaseError(error)
    }
}

/// Joins the caller's transaction, so an import's earlier rows count. A new name without a
/// `created_datetime` gets the current time.
pub fn upsert_name(connection: &StorageConnection, row: &NameRow) -> Result<(), UpsertNameError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertNameError> {
            let repo = NameRowRepository::new(connection);
            let saved = repo.find_one_by_id(&row.id)?;
            validate(connection, saved.as_ref(), row)?;
            let mut row = row.clone();
            if saved.is_none() && row.created_datetime.is_none() {
                row.created_datetime = Some(Utc::now().naive_utc());
            }
            repo.upsert_one(&row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Marks the name deleted, so what refers to it still finds it. Deleting a deleted name keeps
/// its first deletion time.
pub fn delete_name(connection: &StorageConnection, name_id: &str) -> Result<(), DeleteNameError> {
    connection
        .transaction_sync(|connection| -> Result<(), DeleteNameError> {
            let repo = NameRowRepository::new(connection);
            if let Some(saved) = repo.find_one_by_id(name_id)?
                && saved.is_system_name()
            {
                return Err(DeleteNameError::Protected);
            }
            if let Some(user) = repo.used_by(name_id)? {
                return Err(DeleteNameError::InUse(user));
            }
            repo.mark_deleted(name_id)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

fn validate(
    connection: &StorageConnection,
    saved: Option<&NameRow>,
    row: &NameRow,
) -> Result<(), UpsertNameError> {
    if saved.is_some_and(NameRow::is_system_name) || row.is_system_name() {
        return Err(UpsertNameError::Protected);
    }
    if row.code.trim().is_empty() {
        return Err(UpsertNameError::CodeRequired);
    }
    if row.name.trim().is_empty() {
        return Err(UpsertNameError::NameRequired);
    }
    let repo = NameRowRepository::new(connection);
    let is_live = |name: &NameRow| name.deleted_datetime.is_none();
    // Only a save that brings in the clash is checked, so existing duplicates stay editable. A type
    // change counts, as the code meets other names.
    let saved_same_type = saved.filter(|saved| saved.r#type == row.r#type);
    if let Some(other_id) = other_active_with_key(
        saved_same_type,
        row,
        KeyCase::Exact,
        |code| {
            Ok(repo
                .find_by_trimmed_code(code)?
                .into_iter()
                .filter(|other| other.r#type == row.r#type)
                .collect())
        },
        |name| &name.id,
        |name| &name.code,
        is_live,
    )? {
        return Err(UpsertNameError::DuplicateCode { other_id });
    }
    // A saved value that's no longer valid stays editable.
    let changed = |value: fn(&NameRow) -> &Option<String>| {
        value(row)
            .as_ref()
            .filter(|new| saved.is_none_or(|saved| value(saved).as_ref() != Some(*new)))
    };
    if let Some(store_id) = changed(|name| &name.supplying_store_id)
        && !StoreRowRepository::new(connection).check_exists_by_id(store_id)?
    {
        return Err(UpsertNameError::SupplyingStoreNotFound);
    }
    if let Some(currency_id) = changed(|name| &name.currency_id)
        && CurrencyRowRepository::new(connection)
            .find_one_by_id(currency_id)?
            .is_none()
    {
        return Err(UpsertNameError::CurrencyNotFound);
    }
    if let Some(custom_data) = changed(|name| &name.custom_data_string)
        && serde_json::from_str::<serde_json::Value>(custom_data).is_err()
    {
        return Err(UpsertNameError::InvalidCustomData);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        InvoiceRow, InvoiceRowRepository, NameRowType,
        mock::{MockDataInserts, mock_store_a},
        test_db::setup_all,
    };

    fn facility(id: &str, code: &str) -> NameRow {
        NameRow {
            id: id.to_string(),
            code: code.to_string(),
            name: format!("Clinic {id}"),
            r#type: NameRowType::Facility,
            ..Default::default()
        }
    }

    fn find(connection: &StorageConnection, id: &str) -> NameRow {
        NameRowRepository::new(connection)
            .find_one_by_id(id)
            .unwrap()
            .unwrap()
    }

    // covers: OMS-REG-CDIO-01.131

    #[actix_rt::test]
    async fn a_code_is_unique_within_a_type() {
        let (_, connection, _, _) =
            setup_all("upsert_name_duplicate_code", MockDataInserts::none()).await;
        upsert_name(&connection, &facility("a", "CL1")).unwrap();

        assert_eq!(
            upsert_name(&connection, &facility("b", " CL1 ")),
            Err(UpsertNameError::DuplicateCode {
                other_id: "a".to_string()
            })
        );
        // Another type may share it.
        upsert_name(
            &connection,
            &NameRow {
                r#type: NameRowType::Patient,
                ..facility("b", "CL1")
            },
        )
        .unwrap();
        // Changing the patient's type to the facility's brings in the clash.
        assert_eq!(
            upsert_name(&connection, &facility("b", "CL1")),
            Err(UpsertNameError::DuplicateCode {
                other_id: "a".to_string()
            })
        );
        // A deleted name doesn't hold on to its code.
        NameRowRepository::new(&connection)
            .mark_deleted("a")
            .unwrap();
        upsert_name(&connection, &facility("b", "CL1")).unwrap();
    }

    #[actix_rt::test]
    async fn a_new_name_gets_its_created_time() {
        let (_, connection, _, _) =
            setup_all("upsert_name_created_datetime", MockDataInserts::none()).await;
        upsert_name(&connection, &facility("a", "CL1")).unwrap();
        let created = find(&connection, "a").created_datetime;
        assert!(created.is_some());

        assert_eq!(
            upsert_name(&connection, &facility("b", "")),
            Err(UpsertNameError::CodeRequired)
        );
        assert_eq!(
            upsert_name(
                &connection,
                &NameRow {
                    name: " ".to_string(),
                    ..facility("b", "CL2")
                }
            ),
            Err(UpsertNameError::NameRequired)
        );
    }

    // covers: OMS-REG-CDIO-01.133

    #[actix_rt::test]
    async fn references_and_custom_data_are_checked() {
        let (_, connection, _, _) =
            setup_all("upsert_name_references", MockDataInserts::none()).await;
        for (name, error) in [
            (
                NameRow {
                    supplying_store_id: Some("nowhere".to_string()),
                    ..facility("a", "CL1")
                },
                UpsertNameError::SupplyingStoreNotFound,
            ),
            (
                NameRow {
                    currency_id: Some("nowhere".to_string()),
                    ..facility("a", "CL1")
                },
                UpsertNameError::CurrencyNotFound,
            ),
            (
                NameRow {
                    custom_data_string: Some("{not json".to_string()),
                    ..facility("a", "CL1")
                },
                UpsertNameError::InvalidCustomData,
            ),
        ] {
            assert_eq!(upsert_name(&connection, &name), Err(error));
        }

        // A supplying store sync saved before its store arrived stays editable while it's kept.
        let waiting = NameRow {
            supplying_store_id: Some("not_synced_yet".to_string()),
            ..facility("a", "CL1")
        };
        NameRowRepository::new(&connection)
            .upsert_one(&waiting)
            .unwrap();
        upsert_name(
            &connection,
            &NameRow {
                name: "Renamed".to_string(),
                ..waiting
            },
        )
        .unwrap();
    }

    // covers: OMS-REG-CDIO-01.135, .136

    #[actix_rt::test]
    async fn system_and_used_names_are_protected() {
        let (_, connection, _, _) = setup_all(
            "upsert_name_protected",
            MockDataInserts::none().names().stores(),
        )
        .await;
        assert_eq!(
            upsert_name(&connection, &facility("new_invad", "invad")),
            Err(UpsertNameError::Protected)
        );

        let store = mock_store_a();
        assert_eq!(
            delete_name(&connection, &store.name_id),
            Err(DeleteNameError::InUse(NameUser::Store))
        );
        assert_eq!(find(&connection, &store.name_id).deleted_datetime, None);

        upsert_name(&connection, &facility("customer", "CL2")).unwrap();
        InvoiceRowRepository::new(&connection)
            .upsert_one(&InvoiceRow {
                id: "shipment".to_string(),
                name_id: "customer".to_string(),
                store_id: store.id.clone(),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(
            delete_name(&connection, "customer"),
            Err(DeleteNameError::InUse(NameUser::Invoice))
        );

        upsert_name(&connection, &facility("a", "CL1")).unwrap();
        delete_name(&connection, "a").unwrap();
        assert!(find(&connection, "a").deleted_datetime.is_some());
    }
}
