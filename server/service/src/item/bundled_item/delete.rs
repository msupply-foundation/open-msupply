use repository::{item_variant::bundled_item_row::BundledItemRowRepository, RepositoryError};

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum DeleteBundledItemError {
    DatabaseError(RepositoryError),
}

pub struct DeleteBundledItem {
    pub id: String,
}

pub fn delete_bundled_item(
    ctx: &ServiceContext,
    input: DeleteBundledItem,
) -> Result<String, DeleteBundledItemError> {
    ctx.connection
        .transaction_sync(|connection| {
            // No validation needed for delete, since we have a soft delete
            // If it's already deleted, it's fine to delete again...
            let repo = BundledItemRowRepository::new(connection);
            repo.mark_deleted(&input.id)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(input.id)
}

impl From<RepositoryError> for DeleteBundledItemError {
    fn from(error: RepositoryError) -> Self {
        DeleteBundledItemError::DatabaseError(error)
    }
}
