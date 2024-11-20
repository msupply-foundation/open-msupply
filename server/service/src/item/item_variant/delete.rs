use repository::{
    item_variant::{
        bundled_item::{BundledItemFilter, BundledItemRepository},
        bundled_item_row::BundledItemRowRepository,
        item_variant_row::ItemVariantRowRepository,
    },
    EqualFilter, RepositoryError,
};

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
            repo.mark_deleted(&input.id)?;

            let bundled_item_row_repo = BundledItemRowRepository::new(connection);
            let bundled_item_repo = BundledItemRepository::new(connection);

            let bundled_items = bundled_item_repo.query_by_filter(
                BundledItemFilter::new().principal_or_bundled_variant_id(input.id.clone()),
            )?;

            bundled_items
                .into_iter()
                .map(|bundled_item| {
                    bundled_item_row_repo.mark_deleted(&bundled_item.id)?;
                    Ok(())
                })
                .collect::<Result<Vec<_>, RepositoryError>>()?;

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
