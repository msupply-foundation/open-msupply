use repository::{
    types::PropertyValueType, NameProperty, NamePropertyFilter, NamePropertyRepository,
    NamePropertyRow, NamePropertyRowRepository, PropertyRow, PropertyRowRepository,
    RepositoryError, StorageConnectionManager,
};

use crate::{usize_to_u32, ListError, ListResult};

pub fn get_name_properties(
    connection_manager: &StorageConnectionManager,
    filter: Option<NamePropertyFilter>,
) -> Result<ListResult<NameProperty>, ListError> {
    let connection = connection_manager.connection()?;
    let repository = NamePropertyRepository::new(&connection);

    let rows = repository.query(filter.clone())?;

    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}

pub struct InitialiseNameProperty {
    pub id: String,
    pub key: String,
    pub property_id: String,
    pub name: String,
    pub value_type: PropertyValueType,
    pub allowed_values: Option<String>,
    pub remote_editable: bool,
}

pub fn initialise_name_properties(
    connection_manager: &StorageConnectionManager,
    input: Vec<InitialiseNameProperty>,
) -> Result<(), RepositoryError> {
    let connection = connection_manager.connection()?;
    let property_repo = PropertyRowRepository::new(&connection);
    let name_property_repo = NamePropertyRowRepository::new(&connection);

    for InitialiseNameProperty {
        id,
        key,
        property_id,
        name,
        value_type,
        allowed_values,
        remote_editable,
    } in input.into_iter()
    {
        property_repo.upsert_one(&PropertyRow {
            id: property_id.clone(),
            key,
            name,
            value_type,
            allowed_values,
        })?;

        name_property_repo.upsert_one(&NamePropertyRow {
            id,
            property_id,
            remote_editable,
        })?;
    }

    Ok(())
}
