use crate::RepositoryError;
use repository::{
    ItemWarning, ItemWarningJoinFilter, ItemWarningJoinRepository, StorageConnectionManager,
};

pub fn get_item_warning_joins(
    connection_manager: &StorageConnectionManager,
    filter: Option<ItemWarningJoinFilter>,
) -> Result<Vec<ItemWarning>, RepositoryError> {
    let connection = connection_manager.connection()?;
    let repository = ItemWarningJoinRepository::new(&connection);

    let rows = repository.query(filter.clone())?;

    Ok(rows)
}
