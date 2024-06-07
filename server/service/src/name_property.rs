use repository::{
    NameProperty, NamePropertyFilter, NamePropertyRepository, StorageConnectionManager,
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
