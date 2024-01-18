use repository::{
    mock::{mock_name_link_from_name, MockDataCollection},
    NameLinkRowRepository, NameRow, RepositoryError, StorageConnection,
};

pub fn merge_all_name_links(
    connection: &StorageConnection,
    mock_data: &MockDataCollection,
) -> Result<(), RepositoryError> {
    let name_link_repo = NameLinkRowRepository::new(&connection);

    let names: Vec<NameRow> = mock_data
        .data
        .iter()
        .map(|(_, mock)| mock.names.clone())
        .flatten()
        .collect();

    for name in names {
        let mut name_link = mock_name_link_from_name(&name);
        name_link.name_id = "name_a".to_string();
        name_link_repo.upsert_one(&name_link)?;
    }

    Ok(())
}
