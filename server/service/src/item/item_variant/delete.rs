use repository::{
    item_variant::{
        bundled_item::{BundledItemFilter, BundledItemRepository},
        item_variant_row::ItemVariantRowRepository,
    },
    ActivityLogType, RepositoryError, TransactionError,
};

use crate::{
    activity_log::activity_log_entry,
    item::bundled_item::{delete_bundled_item, DeleteBundledItem, DeleteBundledItemError},
    service_provider::ServiceContext,
};

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

            let item_id = repo
                .find_one_by_id(&input.id)?
                .map(|item_variant| item_variant.item_id);

            repo.mark_deleted(&input.id)?;

            let bundled_item_repo = BundledItemRepository::new(connection);
            let bundled_items = bundled_item_repo.query_by_filter(
                BundledItemFilter::new().principal_or_bundled_variant_id(input.id.clone()),
            )?;

            for bundled_item in bundled_items {
                delete_bundled_item(
                    ctx,
                    DeleteBundledItem {
                        id: bundled_item.id,
                    },
                )?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantDeleted,
                item_id,
                None,
                None,
            )?;

            Ok(())
        })
        .map_err(|error: TransactionError<DeleteItemVariantError>| error.to_inner_error())?;
    Ok(input.id)
}

impl From<RepositoryError> for DeleteItemVariantError {
    fn from(error: RepositoryError) -> Self {
        DeleteItemVariantError::DatabaseError(error)
    }
}

impl From<DeleteBundledItemError> for DeleteItemVariantError {
    fn from(error: DeleteBundledItemError) -> Self {
        match error {
            DeleteBundledItemError::DatabaseError(error) => {
                DeleteItemVariantError::DatabaseError(error)
            }
        }
    }
}
