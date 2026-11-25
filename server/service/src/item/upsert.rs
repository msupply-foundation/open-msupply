use crate::record_key::{KeyCase, other_with_key};
use repository::{ItemRow, ItemRowRepository, RepositoryError, StorageConnection};

#[derive(Debug, PartialEq)]
pub enum UpsertItemError {
    CodeRequired,
    NameRequired,
    /// Another item has the code, which would make lookups by code ambiguous.
    DuplicateCode {
        other_id: String,
    },
    DefaultPackSizeNotPositive,
    NegativeVaccineDoses,
    NegativeVolumePerPack,
}

/// Adds or updates one item, which `item_errors` has passed. `saved` is the item with `row.id`,
/// read without its legacy record, which is kept; `row`'s is written only for a new item. The
/// caller finds the row's unit and location type, as an import does from the tables it holds.
pub fn upsert_item_unchecked(
    connection: &StorageConnection,
    saved: Option<&ItemRow>,
    row: &ItemRow,
) -> Result<(), RepositoryError> {
    let repo = ItemRowRepository::new(connection);
    match saved {
        Some(_) => repo.update_keeping_legacy_record(row),
        None => repo.upsert_one(row),
    }
}

/// Every rule `row` breaks. `saved` is as for `upsert_item_unchecked`.
pub fn item_errors(
    connection: &StorageConnection,
    saved: Option<&ItemRow>,
    row: &ItemRow,
) -> Result<Vec<UpsertItemError>, RepositoryError> {
    // Only a value the row changes is checked, so saved items with bad numbers stay editable.
    let changes = |field: fn(&ItemRow) -> f64| saved.is_none_or(|saved| field(saved) != field(row));
    let mut errors: Vec<_> = [
        (row.code.trim().is_empty(), UpsertItemError::CodeRequired),
        (row.name.trim().is_empty(), UpsertItemError::NameRequired),
        (
            row.default_pack_size <= 0.0 && changes(|item| item.default_pack_size),
            UpsertItemError::DefaultPackSizeNotPositive,
        ),
        (
            row.vaccine_doses < 0 && changes(|item| item.vaccine_doses.into()),
            UpsertItemError::NegativeVaccineDoses,
        ),
        (
            row.volume_per_pack < 0.0 && changes(|item| item.volume_per_pack),
            UpsertItemError::NegativeVolumePerPack,
        ),
    ]
    .into_iter()
    .filter_map(|(broken, error)| broken.then_some(error))
    .collect();
    let repo = ItemRowRepository::new(connection);
    if let Some(other) = other_with_key(
        saved.map(|saved| saved.code.as_str()),
        &row.id,
        &row.code,
        KeyCase::Exact,
        |code| repo.find_by_trimmed_code_without_legacy_record(code),
        |other| &other.id,
    )? {
        errors.push(UpsertItemError::DuplicateCode { other_id: other.id });
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn item(id: &str, code: &str) -> ItemRow {
        ItemRow {
            id: id.to_string(),
            code: code.to_string(),
            name: "Paracetamol".to_string(),
            default_pack_size: 10.0,
            ..Default::default()
        }
    }

    fn upsert(connection: &StorageConnection, row: &ItemRow) -> Result<(), Vec<UpsertItemError>> {
        let saved = ItemRowRepository::new(connection)
            .find_one_by_id_without_legacy_record(&row.id)
            .unwrap();
        save_checked(item_errors(connection, saved.as_ref(), row), || {
            upsert_item_unchecked(connection, saved.as_ref(), row)
        })
    }

    fn ids_coded(connection: &StorageConnection, code: &str) -> Vec<String> {
        ItemRowRepository::new(connection)
            .find_by_trimmed_code_without_legacy_record(code)
            .unwrap()
            .into_iter()
            .map(|row| row.id)
            .collect()
    }

    #[actix_rt::test]
    async fn a_recoded_item_is_found_by_its_new_code() {
        let (_, connection, _, _) =
            setup_all("upsert_item_recode_lookup", MockDataInserts::none()).await;
        let repo = ItemRowRepository::new(&connection);
        repo.upsert_one(&item("a", "PARA")).unwrap();
        repo.upsert_one(&item("b", "PARA")).unwrap();

        upsert(&connection, &item("a", "PARA500")).unwrap();
        assert_eq!(ids_coded(&connection, "PARA"), vec!["b"]);
        assert_eq!(ids_coded(&connection, " PARA500 "), vec!["a"]);
        // Letter case counts.
        assert!(ids_coded(&connection, "para").is_empty());
    }

    #[actix_rt::test]
    async fn a_saved_items_legacy_record_is_kept_but_not_read() {
        let (_, connection, _, _) =
            setup_all("upsert_item_keeps_legacy_record", MockDataInserts::none()).await;
        let repo = ItemRowRepository::new(&connection);
        let legacy = ItemRow {
            legacy_record: "{\"from\": \"legacy\"}".to_string(),
            ..item("a", "PARA")
        };
        repo.upsert_one(&legacy).unwrap();
        let found = repo
            .find_one_by_id_without_legacy_record("a")
            .unwrap()
            .unwrap();
        assert_eq!(found.legacy_record, "");

        upsert(
            &connection,
            &ItemRow {
                name: "Paracetamol 500mg".to_string(),
                ..found
            },
        )
        .unwrap();
        let saved = repo.find_one_by_id("a").unwrap().unwrap();
        assert_eq!(saved.name, "Paracetamol 500mg");
        assert_eq!(saved.legacy_record, legacy.legacy_record);
    }

    #[actix_rt::test]
    async fn code_name_and_numbers_are_checked() {
        let (_, connection, _, _) = setup_all("upsert_item_checks", MockDataInserts::none()).await;

        let checks = [
            (item("a", " "), UpsertItemError::CodeRequired),
            (
                ItemRow {
                    name: "".to_string(),
                    ..item("a", "PARA")
                },
                UpsertItemError::NameRequired,
            ),
            (
                ItemRow {
                    default_pack_size: 0.0,
                    ..item("a", "PARA")
                },
                UpsertItemError::DefaultPackSizeNotPositive,
            ),
            (
                ItemRow {
                    vaccine_doses: -1,
                    ..item("a", "PARA")
                },
                UpsertItemError::NegativeVaccineDoses,
            ),
            (
                ItemRow {
                    volume_per_pack: -0.5,
                    ..item("a", "PARA")
                },
                UpsertItemError::NegativeVolumePerPack,
            ),
        ];
        for (row, error) in checks {
            assert_eq!(upsert(&connection, &row), Err(vec![error]));
        }
        upsert(&connection, &item("a", "PARA")).unwrap();
    }

    #[actix_rt::test]
    async fn an_item_cannot_take_another_items_code() {
        let (_, connection, _, _) =
            setup_all("upsert_item_duplicate_code", MockDataInserts::none()).await;
        upsert(&connection, &item("a", "PARA")).unwrap();

        let duplicate = Err(vec![UpsertItemError::DuplicateCode {
            other_id: "a".to_string(),
        }]);
        assert_eq!(upsert(&connection, &item("b", "PARA")), duplicate);
        assert_eq!(upsert(&connection, &item("b", " PARA ")), duplicate);
        // Letter case counts, as it does in lookups.
        upsert(&connection, &item("b", "para")).unwrap();
    }

    #[actix_rt::test]
    async fn a_saved_item_with_a_bad_number_can_be_edited_but_not_given_one() {
        let (_, connection, _, _) =
            setup_all("upsert_item_saved_bad_numbers", MockDataInserts::none()).await;
        let repo = ItemRowRepository::new(&connection);
        // Legacy data has items with a pack size of 0.
        let legacy = ItemRow {
            default_pack_size: 0.0,
            ..item("a", "PARA")
        };
        repo.upsert_one(&legacy).unwrap();

        let renamed = ItemRow {
            name: "Paracetamol 500mg".to_string(),
            ..legacy.clone()
        };
        upsert(&connection, &renamed).unwrap();
        assert_eq!(repo.find_one_by_id("a").unwrap(), Some(renamed.clone()));

        let changed = ItemRow {
            default_pack_size: -1.0,
            ..renamed.clone()
        };
        assert_eq!(
            upsert(&connection, &changed),
            Err(vec![UpsertItemError::DefaultPackSizeNotPositive])
        );
        let negative_volume = ItemRow {
            volume_per_pack: -0.5,
            ..renamed
        };
        assert_eq!(
            upsert(&connection, &negative_volume),
            Err(vec![UpsertItemError::NegativeVolumePerPack])
        );
    }

    #[actix_rt::test]
    async fn items_that_already_share_a_code_can_still_be_edited() {
        let (_, connection, _, _) =
            setup_all("upsert_item_existing_duplicates", MockDataInserts::none()).await;
        let repo = ItemRowRepository::new(&connection);
        repo.upsert_one(&item("a", "PARA")).unwrap();
        repo.upsert_one(&item("b", "PARA")).unwrap();

        let edited = ItemRow {
            name: "Paracetamol 500mg".to_string(),
            ..item("b", "PARA")
        };
        upsert(&connection, &edited).unwrap();
        assert_eq!(repo.find_one_by_id("b").unwrap(), Some(edited));
    }
}
