use crate::record_key::{KeyCase, other_active_with_key};
use chrono::Utc;
use repository::{NameRow, NameRowRepository, NameUser, RepositoryError, StorageConnection};

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
    /// Checked only when the save changes it. The currency and supplying store aren't checked: the
    /// caller finds the currency, and sync saves a name before its store arrives.
    InvalidCustomData,
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

/// Adds or updates one name, which `name_errors` has passed. `saved` is the name with `row.id`. A
/// new name without a `created_datetime` gets the current time.
pub fn upsert_name_unchecked(
    connection: &StorageConnection,
    saved: Option<&NameRow>,
    row: &NameRow,
) -> Result<(), RepositoryError> {
    let mut row = row.clone();
    if saved.is_none() && row.created_datetime.is_none() {
        row.created_datetime = Some(Utc::now().naive_utc());
    }
    NameRowRepository::new(connection).upsert_one(&row)
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

/// Every rule `row` breaks.
pub fn name_errors(
    connection: &StorageConnection,
    saved: Option<&NameRow>,
    row: &NameRow,
) -> Result<Vec<UpsertNameError>, RepositoryError> {
    let mut errors = Vec::new();
    if saved.is_some_and(NameRow::is_system_name) || row.is_system_name() {
        errors.push(UpsertNameError::Protected);
    }
    if row.code.trim().is_empty() {
        errors.push(UpsertNameError::CodeRequired);
    }
    if row.name.trim().is_empty() {
        errors.push(UpsertNameError::NameRequired);
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
        errors.push(UpsertNameError::DuplicateCode { other_id });
    }
    // A saved value that's no longer valid stays editable.
    let changed = |value: fn(&NameRow) -> &Option<String>| {
        value(row)
            .as_ref()
            .filter(|new| saved.is_none_or(|saved| value(saved).as_ref() != Some(*new)))
    };
    if let Some(custom_data) = changed(|name| &name.custom_data_string)
        && serde_json::from_str::<serde_json::Value>(custom_data).is_err()
    {
        errors.push(UpsertNameError::InvalidCustomData);
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use repository::{
        InvoiceRow, InvoiceRowRepository, NameRowType,
        mock::{MockDataInserts, mock_store_a},
        test_db::setup_all,
    };

    fn save(connection: &StorageConnection, row: &NameRow) -> Result<(), Vec<UpsertNameError>> {
        let saved = NameRowRepository::new(connection)
            .find_one_by_id(&row.id)
            .unwrap();
        save_checked(name_errors(connection, saved.as_ref(), row), || {
            upsert_name_unchecked(connection, saved.as_ref(), row)
        })
    }

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
        save(&connection, &facility("a", "CL1")).unwrap();

        assert_eq!(
            save(&connection, &facility("b", " CL1 ")),
            Err(vec![UpsertNameError::DuplicateCode {
                other_id: "a".to_string()
            }])
        );
        // Another type may share it.
        save(
            &connection,
            &NameRow {
                r#type: NameRowType::Patient,
                ..facility("b", "CL1")
            },
        )
        .unwrap();
        // Changing the patient's type to the facility's brings in the clash.
        assert_eq!(
            save(&connection, &facility("b", "CL1")),
            Err(vec![UpsertNameError::DuplicateCode {
                other_id: "a".to_string()
            }])
        );
        // A deleted name doesn't hold on to its code.
        NameRowRepository::new(&connection)
            .mark_deleted("a")
            .unwrap();
        save(&connection, &facility("b", "CL1")).unwrap();
    }

    #[actix_rt::test]
    async fn a_new_name_gets_its_created_time() {
        let (_, connection, _, _) =
            setup_all("upsert_name_created_datetime", MockDataInserts::none()).await;
        save(&connection, &facility("a", "CL1")).unwrap();
        let created = find(&connection, "a").created_datetime;
        assert!(created.is_some());

        assert_eq!(
            save(&connection, &facility("b", "")),
            Err(vec![UpsertNameError::CodeRequired])
        );
        assert_eq!(
            save(
                &connection,
                &NameRow {
                    name: " ".to_string(),
                    ..facility("b", "CL2")
                }
            ),
            Err(vec![UpsertNameError::NameRequired])
        );
    }

    // covers: OMS-REG-CDIO-01.133

    #[actix_rt::test]
    async fn custom_data_is_checked_but_not_the_supplying_store() {
        let (_, connection, _, _) =
            setup_all("upsert_name_references", MockDataInserts::none()).await;
        let name = NameRow {
            custom_data_string: Some("{not json".to_string()),
            ..facility("a", "CL1")
        };
        assert_eq!(
            save(&connection, &name),
            Err(vec![UpsertNameError::InvalidCustomData])
        );

        // A supplying store that hasn't arrived yet is saved, as sync saves it.
        save(
            &connection,
            &NameRow {
                supplying_store_id: Some("not_synced_yet".to_string()),
                ..facility("a", "CL1")
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
            save(&connection, &facility("new_invad", "invad")),
            Err(vec![UpsertNameError::Protected])
        );

        let store = mock_store_a();
        assert_eq!(
            delete_name(&connection, &store.name_id),
            Err(DeleteNameError::InUse(NameUser::Store))
        );
        assert_eq!(find(&connection, &store.name_id).deleted_datetime, None);

        save(&connection, &facility("customer", "CL2")).unwrap();
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

        save(&connection, &facility("a", "CL1")).unwrap();
        delete_name(&connection, "a").unwrap();
        assert!(find(&connection, "a").deleted_datetime.is_some());
    }
}
