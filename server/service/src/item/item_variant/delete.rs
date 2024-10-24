use repository::{item_variant::item_variant_row::ItemVariantRowRepository, RepositoryError};

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum DeleteItemVariantError {
    DatabaseError(RepositoryError),
}

pub struct DeleteItemVariant {
    pub id: String,
}

pub fn delete_item_variant(
    ctx: &ServiceContext,
    input: DeleteItemVariant,
) -> Result<String, DeleteItemVariantError> {
    ctx.connection
        .transaction_sync(|connection| {
            // No validation needed for delete, since we have a soft delete
            // If it's already deleted, it's fine to delete again...
            let repo = ItemVariantRowRepository::new(connection);
            repo.mark_deleted(&input.id)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(input.id)
}

impl From<RepositoryError> for DeleteItemVariantError {
    fn from(error: RepositoryError) -> Self {
        DeleteItemVariantError::DatabaseError(error)
    }
}
