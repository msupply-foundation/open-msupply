use repository::{
    ItemStoreJoinRow, ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait,
    LocationRowRepository, RepositoryError, StorageConnection,
};

#[derive(Debug, PartialEq)]
pub enum UpsertItemStoreJoinError {
    /// The default location belongs to another store.
    LocationInAnotherStore {
        location_code: String,
        location_store_id: String,
    },
    NegativePrice,
    /// Another join already holds the item's properties in the store.
    DuplicateJoin {
        other_id: String,
    },
}

/// Saves an item's properties in a store: its default sell price, margin, default location and
/// whether orders ignore it. `row` has passed `item_store_join_errors`.
pub fn upsert_item_store_join_unchecked(
    connection: &StorageConnection,
    row: &ItemStoreJoinRow,
) -> Result<(), RepositoryError> {
    ItemStoreJoinRowRepository::new(connection).upsert_one(row)
}

/// Removes the item's properties in the store, so it takes the defaults.
pub fn delete_item_store_join(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), RepositoryError> {
    ItemStoreJoinRowRepository::new(connection).delete(id)
}

/// Every rule `row` breaks. Only what the save changes is checked, so a saved join that no longer
/// passes, such as one with a negative price, stays editable. The caller finds its item, store and
/// location, so a missing one isn't checked here.
pub fn item_store_join_errors(
    connection: &StorageConnection,
    saved: Option<&ItemStoreJoinRow>,
    row: &ItemStoreJoinRow,
) -> Result<Vec<UpsertItemStoreJoinError>, RepositoryError> {
    let mut errors = Vec::new();
    let item_changes = saved.is_none_or(|saved| saved.item_id != row.item_id);
    let store_changes = saved.is_none_or(|saved| saved.store_id != row.store_id);
    let location_changes = store_changes
        || saved.is_none_or(|saved| saved.default_location_id != row.default_location_id);
    let price_changes = saved
        .is_none_or(|saved| saved.default_sell_price_per_pack != row.default_sell_price_per_pack);
    if location_changes
        && let Some(location_id) = &row.default_location_id
        && let Some(location) =
            LocationRowRepository::new(connection).find_one_by_id(location_id)?
        && location.store_id != row.store_id
    {
        errors.push(UpsertItemStoreJoinError::LocationInAnotherStore {
            location_code: location.code,
            location_store_id: location.store_id,
        });
    }
    if price_changes && row.default_sell_price_per_pack < 0.0 {
        errors.push(UpsertItemStoreJoinError::NegativePrice);
    }
    if (item_changes || store_changes)
        && let Some(other) = ItemStoreJoinRowRepository::new(connection)
            .find_by_item_and_store(&row.item_id, &row.store_id)?
            .into_iter()
            .find(|other| other.id != row.id)
    {
        errors.push(UpsertItemStoreJoinError::DuplicateJoin { other_id: other.id });
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use repository::{
        ItemRow, ItemRowRepository, LocationRow, NameRow, NameRowRepository, StoreRow,
        StoreRowRepository, mock::MockDataInserts, test_db::setup_all,
    };

    fn save(
        connection: &StorageConnection,
        row: &ItemStoreJoinRow,
    ) -> Result<(), Vec<UpsertItemStoreJoinError>> {
        let saved = ItemStoreJoinRowRepository::new(connection)
            .find_one_by_id(&row.id)
            .unwrap();
        save_checked(
            item_store_join_errors(connection, saved.as_ref(), row),
            || upsert_item_store_join_unchecked(connection, row),
        )
    }

    fn join(id: &str, item_id: &str) -> ItemStoreJoinRow {
        ItemStoreJoinRow {
            id: id.to_string(),
            item_id: item_id.to_string(),
            store_id: "store".to_string(),
            default_sell_price_per_pack: 2.0,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn an_item_has_its_properties_in_a_store_through_one_join() {
        let (_, connection, _, _) =
            setup_all("upsert_item_store_join", MockDataInserts::none()).await;
        for item_id in ["para", "ibu"] {
            ItemRowRepository::new(&connection)
                .upsert_one(&ItemRow {
                    id: item_id.to_string(),
                    code: item_id.to_uppercase(),
                    ..Default::default()
                })
                .unwrap();
        }
        for (store_id, name_id) in [("store", "store_name"), ("other", "other_name")] {
            NameRowRepository::new(&connection)
                .upsert_one(&NameRow {
                    id: name_id.to_string(),
                    ..Default::default()
                })
                .unwrap();
            StoreRowRepository::new(&connection)
                .upsert_one(&StoreRow {
                    id: store_id.to_string(),
                    name_id: name_id.to_string(),
                    ..Default::default()
                })
                .unwrap();
        }
        for (id, store_id) in [("shelf", "store"), ("other_shelf", "other")] {
            LocationRowRepository::new(&connection)
                .upsert_one(&LocationRow {
                    id: id.to_string(),
                    code: id.to_uppercase(),
                    store_id: store_id.to_string(),
                    ..Default::default()
                })
                .unwrap();
        }

        save(
            &connection,
            &ItemStoreJoinRow {
                default_location_id: Some("shelf".to_string()),
                ..join("a", "para")
            },
        )
        .unwrap();
        assert_eq!(
            save(&connection, &join("b", "para")),
            Err(vec![UpsertItemStoreJoinError::DuplicateJoin {
                other_id: "a".to_string()
            }])
        );
        assert_eq!(
            save(
                &connection,
                &ItemStoreJoinRow {
                    default_location_id: Some("other_shelf".to_string()),
                    ..join("b", "ibu")
                }
            ),
            Err(vec![UpsertItemStoreJoinError::LocationInAnotherStore {
                location_code: "OTHER_SHELF".to_string(),
                location_store_id: "other".to_string()
            }])
        );
        assert_eq!(
            save(
                &connection,
                &ItemStoreJoinRow {
                    default_sell_price_per_pack: -1.0,
                    ..join("b", "ibu")
                }
            ),
            Err(vec![UpsertItemStoreJoinError::NegativePrice])
        );

        // A saved negative price stays editable while the save leaves it as it is.
        ItemStoreJoinRowRepository::new(&connection)
            .upsert_one(&ItemStoreJoinRow {
                default_sell_price_per_pack: -1.0,
                ..join("b", "ibu")
            })
            .unwrap();
        save(
            &connection,
            &ItemStoreJoinRow {
                default_sell_price_per_pack: -1.0,
                margin: 5.0,
                ..join("b", "ibu")
            },
        )
        .unwrap();

        delete_item_store_join(&connection, "a").unwrap();
        let repo = ItemStoreJoinRowRepository::new(&connection);
        assert_eq!(repo.find_by_item_and_store("para", "store").unwrap(), []);
        assert_eq!(
            repo.find_by_item_and_store("ibu", "store").unwrap().len(),
            1
        );
        // Deleting a join that isn't there does nothing.
        delete_item_store_join(&connection, "a").unwrap();
    }
}
