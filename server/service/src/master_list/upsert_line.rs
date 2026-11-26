use repository::{
    MasterListLineRow, MasterListLineRowRepository, RepositoryError, StorageConnection,
};
use util::constants::MISSING_PROGRAM;

#[derive(Debug, PartialEq)]
pub enum UpsertMasterListLineError {
    /// The `MISSING_PROGRAM` placeholder, which holds no items.
    Protected,
    /// A price below 0. Checked only when the price changes, so a saved line with one stays
    /// editable.
    NegativePrice,
    /// Another line already puts the item on the master list.
    DuplicateLine { other_id: String },
}

/// Puts an item on a master list, at the line's price. `row` has passed `master_list_line_errors`.
pub fn upsert_master_list_line_unchecked(
    connection: &StorageConnection,
    row: &MasterListLineRow,
) -> Result<(), RepositoryError> {
    MasterListLineRowRepository::new(connection).upsert_one(row)
}

/// Takes the item off the master list.
pub fn delete_master_list_line(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), RepositoryError> {
    MasterListLineRowRepository::new(connection).delete(id)
}

/// The lines that put the item on the master list, in id order: one, unless legacy mSupply sent
/// more.
pub fn find_master_list_lines(
    connection: &StorageConnection,
    master_list_id: &str,
    item_id: &str,
) -> Result<Vec<MasterListLineRow>, RepositoryError> {
    MasterListLineRowRepository::new(connection)
        .find_by_master_list_and_item(master_list_id, item_id)
}

/// Every rule `row` breaks. Only what the save changes is checked, so a saved line that no longer
/// passes stays editable. The caller finds its master list and item, so a missing one isn't checked
/// here.
pub fn master_list_line_errors(
    connection: &StorageConnection,
    saved: Option<&MasterListLineRow>,
    row: &MasterListLineRow,
) -> Result<Vec<UpsertMasterListLineError>, RepositoryError> {
    let mut errors = Vec::new();
    let master_list_changes = saved.is_none_or(|saved| saved.master_list_id != row.master_list_id);
    let item_changes = saved.is_none_or(|saved| saved.item_id != row.item_id);
    let price_changes = saved.is_none_or(|saved| saved.price_per_unit != row.price_per_unit);
    if price_changes && row.price_per_unit.is_some_and(|price| price < 0.0) {
        errors.push(UpsertMasterListLineError::NegativePrice);
    }
    if master_list_changes && row.master_list_id == MISSING_PROGRAM {
        errors.push(UpsertMasterListLineError::Protected);
    }
    if (master_list_changes || item_changes)
        && let Some(other) = find_master_list_lines(connection, &row.master_list_id, &row.item_id)?
            .into_iter()
            .find(|other| other.id != row.id)
    {
        errors.push(UpsertMasterListLineError::DuplicateLine { other_id: other.id });
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use repository::{
        ItemRow, ItemRowRepository, MasterListRow, MasterListRowRepository, mock::MockDataInserts,
        test_db::setup_all,
    };

    fn save(
        connection: &StorageConnection,
        row: &MasterListLineRow,
    ) -> Result<(), Vec<UpsertMasterListLineError>> {
        let saved = MasterListLineRowRepository::new(connection)
            .find_one_by_id(&row.id)
            .unwrap();
        save_checked(
            master_list_line_errors(connection, saved.as_ref(), row),
            || upsert_master_list_line_unchecked(connection, row),
        )
    }

    fn line(id: &str, item_id: &str) -> MasterListLineRow {
        MasterListLineRow {
            id: id.to_string(),
            master_list_id: "eml".to_string(),
            price_per_unit: Some(2.5),
            item_id: item_id.to_string(),
        }
    }

    // covers: OMS-REG-CDIO-01.179, .183

    #[actix_rt::test]
    async fn an_item_is_on_a_master_list_through_one_line() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_line", MockDataInserts::none()).await;
        MasterListRowRepository::new(&connection)
            .upsert_one(&MasterListRow {
                id: "eml".to_string(),
                name: "Essential medicines".to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
        for id in ["paracetamol", "ibuprofen"] {
            ItemRowRepository::new(&connection)
                .upsert_one(&ItemRow {
                    id: id.to_string(),
                    code: id.to_uppercase(),
                    ..Default::default()
                })
                .unwrap();
        }

        save(&connection, &line("a", "paracetamol")).unwrap();
        assert_eq!(
            save(&connection, &line("b", "paracetamol")),
            Err(vec![UpsertMasterListLineError::DuplicateLine {
                other_id: "a".to_string()
            }])
        );
        assert_eq!(
            save(
                &connection,
                &MasterListLineRow {
                    master_list_id: MISSING_PROGRAM.to_string(),
                    ..line("b", "ibuprofen")
                }
            ),
            Err(vec![UpsertMasterListLineError::Protected])
        );

        assert_eq!(
            save(
                &connection,
                &MasterListLineRow {
                    price_per_unit: Some(-1.0),
                    ..line("b", "ibuprofen")
                }
            ),
            Err(vec![UpsertMasterListLineError::NegativePrice])
        );
        // A price of 0 is a price.
        save(
            &connection,
            &MasterListLineRow {
                price_per_unit: Some(0.0),
                ..line("c", "ibuprofen")
            },
        )
        .unwrap();
        delete_master_list_line(&connection, "c").unwrap();
        // A saved negative price stays editable while the price is left as it is.
        MasterListLineRowRepository::new(&connection)
            .upsert_one(&MasterListLineRow {
                price_per_unit: Some(-1.0),
                ..line("d", "paracetamol")
            })
            .unwrap();
        save(
            &connection,
            &MasterListLineRow {
                price_per_unit: Some(-1.0),
                ..line("d", "paracetamol")
            },
        )
        .unwrap();
        delete_master_list_line(&connection, "d").unwrap();

        // Its price changes; moving it onto the item another line has is a duplicate.
        save(&connection, &line("b", "ibuprofen")).unwrap();
        save(
            &connection,
            &MasterListLineRow {
                price_per_unit: None,
                ..line("a", "paracetamol")
            },
        )
        .unwrap();
        assert_eq!(
            find_master_list_lines(&connection, "eml", "paracetamol").unwrap(),
            [MasterListLineRow {
                price_per_unit: None,
                ..line("a", "paracetamol")
            }]
        );
        assert_eq!(
            save(&connection, &line("b", "paracetamol")),
            Err(vec![UpsertMasterListLineError::DuplicateLine {
                other_id: "a".to_string()
            }])
        );

        delete_master_list_line(&connection, "a").unwrap();
        assert_eq!(
            find_master_list_lines(&connection, "eml", "paracetamol").unwrap(),
            []
        );
    }
}
