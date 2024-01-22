use repository::{
    mock::{mock_item_link_from_item, MockDataCollection},
    ItemLinkRowRepository, ItemRow, NameLinkRow, NameLinkRowRepository, NameRow, RepositoryError,
    StorageConnection,
};

// Changes all name_id values to "name_a" to merge all names into "name_a".
pub fn merge_all_name_links(
    connection: &StorageConnection,
    mock_data: &MockDataCollection,
) -> Result<(), RepositoryError> {
    let name_link_repo = NameLinkRowRepository::new(&connection);

    let names: Vec<NameRow> = mock_data
        .data
        .iter()
        .flat_map(|(_, mock)| mock.names.clone())
        .collect();

    for name in names {
        let mut name_link = NameLinkRow {
            id: name.id.clone(),
            name_id: name.id.clone(),
        };

        name_link.name_id = "name_a".to_string();
        name_link_repo.upsert_one(&name_link)?;
    }

    Ok(())
}

// Changes all item_id values to "item_a" to merge all items into "item_a".
pub fn merge_all_item_links(
    connection: &StorageConnection,
    mock_data: &MockDataCollection,
) -> Result<(), RepositoryError> {
    let item_link_repo = ItemLinkRowRepository::new(&connection);

    let items: Vec<ItemRow> = mock_data
        .data
        .iter()
        .flat_map(|(_, mock)| mock.items.clone())
        .collect();

    for item in items {
        let mut item_link = mock_item_link_from_item(&item);
        item_link.item_id = "item_a".to_string();
        item_link_repo.upsert_one(&item_link)?;
    }

    Ok(())
}
