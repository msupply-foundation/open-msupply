use crate::RepositoryError;
use repository::{
    ItemWarningLink, ItemWarningLinkFilter, ItemWarningLinkRepository, StorageConnectionManager,
};

pub fn get_item_warning_links(
    connection_manager: &StorageConnectionManager,
    filter: Option<ItemWarningLinkFilter>,
) -> Result<Vec<ItemWarningLink>, RepositoryError> {
    // let repository = ItemWarningLinkRepository::new(&ctx.connection);

    let connection = connection_manager.connection()?;
    let repository = ItemWarningLinkRepository::new(&connection);

    let rows = repository.query(filter.clone())?;

    Ok(rows)
}
