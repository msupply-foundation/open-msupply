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

// This is super bare bones, no validations or anything
// We only call this endpoint with predefined values from the frontend
// And it just does an upsert, so no worries about duplicates
// There's no risk in additional name properties being added, but this should get
// fleshed out at whatever point we add an actual UI to manage properties :)
pub fn initialise_name_properties(
    connection_manager: &StorageConnectionManager,
    input: Vec<InitialiseNameProperty>,
) -> Result<(), RepositoryError> {
    let connection = connection_manager.connection()?;
    let property_repo = PropertyRowRepository::new(&connection);
    let name_property_repo = NamePropertyRowRepository::new(&connection);

    for property in input.into_iter() {
        let InitialiseNameProperty {
            id,
            key,
            name,
            value_type,
            allowed_values,

            property_id,
            remote_editable,
        } = property;

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
