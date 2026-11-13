use crate::keyed_lookup::{Keyed, KeyedLookup};
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
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertItemError {
    fn from(error: RepositoryError) -> Self {
        UpsertItemError::DatabaseError(error)
    }
}

pub type ItemLookup = KeyedLookup<ItemRow>;

/// Looked up by code.
impl Keyed for ItemRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.code
    }
}

impl ItemLookup {
    /// Holds each item with an empty `legacy_record`, as it's most of an item's size and
    /// `upsert_item_in` never changes it.
    pub fn load_all(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        Ok(Self::from_rows(
            ItemRowRepository::new(connection).find_all_without_legacy_record()?,
        ))
    }
}

/// Keeps a saved item's `legacy_record`; `row`'s is written only for a new item. `lookup` must
/// hold every saved item, as it tells a saved item from a new one. Joins the caller's
/// transaction when there is one.
pub fn upsert_item_in(
    connection: &StorageConnection,
    lookup: &mut ItemLookup,
    row: &ItemRow,
) -> Result<(), UpsertItemError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertItemError> {
            validate(lookup, row)?;
            let repo = ItemRowRepository::new(connection);
            match lookup.by_id(&row.id) {
                Some(_) => repo.update_keeping_legacy_record(row)?,
                None => repo.upsert_one(row)?,
            }
            Ok(())
        })
        .map_err(|error| error.to_inner_error())?;
    lookup.put(ItemRow {
        legacy_record: String::new(),
        ..row.clone()
    });
    Ok(())
}

fn validate(lookup: &ItemLookup, row: &ItemRow) -> Result<(), UpsertItemError> {
    if row.code.trim().is_empty() {
        return Err(UpsertItemError::CodeRequired);
    }
    if row.name.trim().is_empty() {
        return Err(UpsertItemError::NameRequired);
    }
    // Only a value the row changes is checked, so saved items with bad numbers stay editable.
    let saved = lookup.by_id(&row.id);
    let changes = |field: fn(&ItemRow) -> f64| saved.is_none_or(|saved| field(saved) != field(row));
    if row.default_pack_size <= 0.0 && changes(|item| item.default_pack_size) {
        return Err(UpsertItemError::DefaultPackSizeNotPositive);
    }
    if row.vaccine_doses < 0 && changes(|item| item.vaccine_doses.into()) {
        return Err(UpsertItemError::NegativeVaccineDoses);
    }
    if row.volume_per_pack < 0.0 && changes(|item| item.volume_per_pack) {
        return Err(UpsertItemError::NegativeVolumePerPack);
    }
    match lookup.taken_by(row) {
        Some(other) => Err(UpsertItemError::DuplicateCode {
            other_id: other.id.clone(),
        }),
        None => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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

    /// Saves as the import does, from a fresh lookup.
    fn upsert(connection: &StorageConnection, row: &ItemRow) -> Result<(), UpsertItemError> {
        upsert_item_in(connection, &mut ItemLookup::load_all(connection)?, row)
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
            assert_eq!(upsert(&connection, &row), Err(error));
        }
        upsert(&connection, &item("a", "PARA")).unwrap();
    }

    #[actix_rt::test]
    async fn an_item_cannot_take_another_items_code() {
        let (_, connection, _, _) =
            setup_all("upsert_item_duplicate_code", MockDataInserts::none()).await;
        upsert(&connection, &item("a", "PARA")).unwrap();

        let duplicate = Err(UpsertItemError::DuplicateCode {
            other_id: "a".to_string(),
        });
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
            Err(UpsertItemError::DefaultPackSizeNotPositive)
        );
        let negative_volume = ItemRow {
            volume_per_pack: -0.5,
            ..renamed
        };
        assert_eq!(
            upsert(&connection, &negative_volume),
            Err(UpsertItemError::NegativeVolumePerPack)
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
