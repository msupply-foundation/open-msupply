use repository::{
    ItemRowRepository, MasterListLineRow, MasterListLineRowRepository, MasterListRowRepository,
    RepositoryError, StorageConnection,
};
use util::constants::MISSING_PROGRAM;

#[derive(Debug, PartialEq)]
pub enum UpsertMasterListLineError {
    MasterListNotFound,
    /// The `MISSING_PROGRAM` placeholder, which holds no items.
    Protected,
    ItemNotFound,
    /// A price below 0. Checked only when the price changes, so a saved line with one stays
    /// editable.
    NegativePrice,
    /// Another line already puts the item on the master list.
    DuplicateLine {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertMasterListLineError {
    fn from(error: RepositoryError) -> Self {
        UpsertMasterListLineError::DatabaseError(error)
    }
}

/// Puts an item on a master list, at the line's price. Joins the caller's transaction, so an
/// import's earlier rows count.
pub fn upsert_master_list_line(
    connection: &StorageConnection,
    row: &MasterListLineRow,
) -> Result<(), UpsertMasterListLineError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertMasterListLineError> {
            let repo = MasterListLineRowRepository::new(connection);
            let saved = repo.find_one_by_id(&row.id)?;
            validate(connection, saved.as_ref(), row)?;
            repo.upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
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

/// Only what the save changes is checked, so a saved line that no longer passes stays editable.
fn validate(
    connection: &StorageConnection,
    saved: Option<&MasterListLineRow>,
    row: &MasterListLineRow,
) -> Result<(), UpsertMasterListLineError> {
    let master_list_changes = saved.is_none_or(|saved| saved.master_list_id != row.master_list_id);
    let item_changes = saved.is_none_or(|saved| saved.item_id != row.item_id);
    let price_changes = saved.is_none_or(|saved| saved.price_per_unit != row.price_per_unit);
    if price_changes && row.price_per_unit.is_some_and(|price| price < 0.0) {
        return Err(UpsertMasterListLineError::NegativePrice);
    }
    if master_list_changes {
        if row.master_list_id == MISSING_PROGRAM {
            return Err(UpsertMasterListLineError::Protected);
        }
        if !MasterListRowRepository::new(connection).check_exists_by_id(&row.master_list_id)? {
            return Err(UpsertMasterListLineError::MasterListNotFound);
        }
    }
    if item_changes && !ItemRowRepository::new(connection).check_exists_by_id(&row.item_id)? {
        return Err(UpsertMasterListLineError::ItemNotFound);
    }
    if (master_list_changes || item_changes)
        && let Some(other) = find_master_list_lines(connection, &row.master_list_id, &row.item_id)?
            .into_iter()
            .find(|other| other.id != row.id)
    {
        return Err(UpsertMasterListLineError::DuplicateLine { other_id: other.id });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{ItemRow, MasterListRow, mock::MockDataInserts, test_db::setup_all};

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

        upsert_master_list_line(&connection, &line("a", "paracetamol")).unwrap();
        assert_eq!(
            upsert_master_list_line(&connection, &line("b", "paracetamol")),
            Err(UpsertMasterListLineError::DuplicateLine {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            upsert_master_list_line(&connection, &line("b", "nothing")),
            Err(UpsertMasterListLineError::ItemNotFound)
        );
        assert_eq!(
            upsert_master_list_line(
                &connection,
                &MasterListLineRow {
                    master_list_id: "no_list".to_string(),
                    ..line("b", "ibuprofen")
                }
            ),
            Err(UpsertMasterListLineError::MasterListNotFound)
        );
        assert_eq!(
            upsert_master_list_line(
                &connection,
                &MasterListLineRow {
                    master_list_id: MISSING_PROGRAM.to_string(),
                    ..line("b", "ibuprofen")
                }
            ),
            Err(UpsertMasterListLineError::Protected)
        );

        assert_eq!(
            upsert_master_list_line(
                &connection,
                &MasterListLineRow {
                    price_per_unit: Some(-1.0),
                    ..line("b", "ibuprofen")
                }
            ),
            Err(UpsertMasterListLineError::NegativePrice)
        );
        // A price of 0 is a price.
        upsert_master_list_line(
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
        upsert_master_list_line(
            &connection,
            &MasterListLineRow {
                price_per_unit: Some(-1.0),
                ..line("d", "paracetamol")
            },
        )
        .unwrap();
        delete_master_list_line(&connection, "d").unwrap();

        // Its price changes; moving it onto the item another line has is a duplicate.
        upsert_master_list_line(&connection, &line("b", "ibuprofen")).unwrap();
        upsert_master_list_line(
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
            upsert_master_list_line(&connection, &line("b", "paracetamol")),
            Err(UpsertMasterListLineError::DuplicateLine {
                other_id: "a".to_string()
            })
        );

        delete_master_list_line(&connection, "a").unwrap();
        assert_eq!(
            find_master_list_lines(&connection, "eml", "paracetamol").unwrap(),
            []
        );
    }
}
