use repository::{
    item_variant::bundled_item_row::BundledItemRowRepository, ActivityLogType, RepositoryError,
    TransactionError,
};

use crate::{
    activity_log::activity_log_entry, check_item_variant_exists, service_provider::ServiceContext,
};

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

            let item_id = match repo.find_one_by_id(&input.id)? {
                Some(bundled_item) => {
                    check_item_variant_exists(connection, &bundled_item.principal_item_variant_id)?
                        .map(|item_variant| item_variant.item_id)
                }
                None => None,
            };

            let result = repo.mark_deleted(&input.id)?;

            activity_log_entry(
                ctx,
                ActivityLogType::BundledItemDeleted,
                item_id,
                None,
                None,
            )?;

            Ok(result)
        })
        .map_err(|error: TransactionError<DeleteBundledItemError>| error.to_inner_error())?;
    Ok(input.id)
}

impl From<RepositoryError> for DeleteBundledItemError {
    fn from(error: RepositoryError) -> Self {
        DeleteBundledItemError::DatabaseError(error)
    }
}
