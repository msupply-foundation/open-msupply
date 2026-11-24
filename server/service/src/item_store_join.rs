use repository::{
    ItemRowRepository, ItemStoreJoinRow, ItemStoreJoinRowRepository,
    ItemStoreJoinRowRepositoryTrait, LocationRowRepository, RepositoryError, StorageConnection,
    StoreRowRepository,
};

#[derive(Debug, PartialEq)]
pub enum UpsertItemStoreJoinError {
    ItemNotFound,
    StoreNotFound,
    LocationNotFound,
    /// The default location belongs to another store.
    LocationInAnotherStore {
        location_store_id: String,
    },
    NegativePrice,
    /// Another join already holds the item's properties in the store.
    DuplicateJoin {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertItemStoreJoinError {
    fn from(error: RepositoryError) -> Self {
        UpsertItemStoreJoinError::DatabaseError(error)
    }
}

/// Saves an item's properties in a store: its default sell price, margin, default location and
/// whether orders ignore it. Joins the caller's transaction, so an import's earlier rows count.
pub fn upsert_item_store_join(
    connection: &StorageConnection,
    row: &ItemStoreJoinRow,
) -> Result<(), UpsertItemStoreJoinError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertItemStoreJoinError> {
            let repo = ItemStoreJoinRowRepository::new(connection);
            let saved = repo.find_one_by_id(&row.id)?;
            validate(connection, saved.as_ref(), row)?;
            repo.upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Removes the item's properties in the store, so it takes the defaults.
pub fn delete_item_store_join(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), RepositoryError> {
    ItemStoreJoinRowRepository::new(connection).delete(id)
}

/// The joins between the item and the store, in id order: one, unless legacy mSupply sent more or
/// merging two items left both.
pub fn find_item_store_joins(
    connection: &StorageConnection,
    item_id: &str,
    store_id: &str,
) -> Result<Vec<ItemStoreJoinRow>, RepositoryError> {
    ItemStoreJoinRowRepository::new(connection).find_by_item_and_store(item_id, store_id)
}

/// Only what the save changes is checked, so a saved join that no longer passes, such as one with
/// a negative price, stays editable.
fn validate(
    connection: &StorageConnection,
    saved: Option<&ItemStoreJoinRow>,
    row: &ItemStoreJoinRow,
) -> Result<(), UpsertItemStoreJoinError> {
    let item_changes = saved.is_none_or(|saved| saved.item_id != row.item_id);
    let store_changes = saved.is_none_or(|saved| saved.store_id != row.store_id);
    let location_changes = store_changes
        || saved.is_none_or(|saved| saved.default_location_id != row.default_location_id);
    let price_changes = saved
        .is_none_or(|saved| saved.default_sell_price_per_pack != row.default_sell_price_per_pack);
    if item_changes
        && ItemRowRepository::new(connection)
            .find_one_by_id_without_legacy_record(&row.item_id)?
            .is_none()
    {
        return Err(UpsertItemStoreJoinError::ItemNotFound);
    }
    if store_changes
        && StoreRowRepository::new(connection)
            .find_one_by_id(&row.store_id)?
            .is_none()
    {
        return Err(UpsertItemStoreJoinError::StoreNotFound);
    }
    if location_changes && let Some(location_id) = &row.default_location_id {
        let location = LocationRowRepository::new(connection)
            .find_one_by_id(location_id)?
            .ok_or(UpsertItemStoreJoinError::LocationNotFound)?;
        if location.store_id != row.store_id {
            return Err(UpsertItemStoreJoinError::LocationInAnotherStore {
                location_store_id: location.store_id,
            });
        }
    }
    if price_changes && row.default_sell_price_per_pack < 0.0 {
        return Err(UpsertItemStoreJoinError::NegativePrice);
    }
    if (item_changes || store_changes)
        && let Some(other) = find_item_store_joins(connection, &row.item_id, &row.store_id)?
            .into_iter()
            .find(|other| other.id != row.id)
    {
        return Err(UpsertItemStoreJoinError::DuplicateJoin { other_id: other.id });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        ItemRow, LocationRow, NameRow, NameRowRepository, StoreRow, mock::MockDataInserts,
        test_db::setup_all,
    };

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

        upsert_item_store_join(
            &connection,
            &ItemStoreJoinRow {
                default_location_id: Some("shelf".to_string()),
                ..join("a", "para")
            },
        )
        .unwrap();
        assert_eq!(
            upsert_item_store_join(&connection, &join("b", "para")),
            Err(UpsertItemStoreJoinError::DuplicateJoin {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            upsert_item_store_join(&connection, &join("b", "nothing")),
            Err(UpsertItemStoreJoinError::ItemNotFound)
        );
        assert_eq!(
            upsert_item_store_join(
                &connection,
                &ItemStoreJoinRow {
                    store_id: "no_store".to_string(),
                    ..join("b", "ibu")
                }
            ),
            Err(UpsertItemStoreJoinError::StoreNotFound)
        );
        assert_eq!(
            upsert_item_store_join(
                &connection,
                &ItemStoreJoinRow {
                    default_location_id: Some("no_shelf".to_string()),
                    ..join("b", "ibu")
                }
            ),
            Err(UpsertItemStoreJoinError::LocationNotFound)
        );
        assert_eq!(
            upsert_item_store_join(
                &connection,
                &ItemStoreJoinRow {
                    default_location_id: Some("other_shelf".to_string()),
                    ..join("b", "ibu")
                }
            ),
            Err(UpsertItemStoreJoinError::LocationInAnotherStore {
                location_store_id: "other".to_string()
            })
        );
        assert_eq!(
            upsert_item_store_join(
                &connection,
                &ItemStoreJoinRow {
                    default_sell_price_per_pack: -1.0,
                    ..join("b", "ibu")
                }
            ),
            Err(UpsertItemStoreJoinError::NegativePrice)
        );

        // A saved negative price stays editable while the save leaves it as it is.
        ItemStoreJoinRowRepository::new(&connection)
            .upsert_one(&ItemStoreJoinRow {
                default_sell_price_per_pack: -1.0,
                ..join("b", "ibu")
            })
            .unwrap();
        upsert_item_store_join(
            &connection,
            &ItemStoreJoinRow {
                default_sell_price_per_pack: -1.0,
                margin: 5.0,
                ..join("b", "ibu")
            },
        )
        .unwrap();

        delete_item_store_join(&connection, "a").unwrap();
        assert_eq!(
            find_item_store_joins(&connection, "para", "store").unwrap(),
            []
        );
        assert_eq!(
            find_item_store_joins(&connection, "ibu", "store")
                .unwrap()
                .len(),
            1
        );
        // Deleting a join that isn't there does nothing.
        delete_item_store_join(&connection, "a").unwrap();
    }
}
