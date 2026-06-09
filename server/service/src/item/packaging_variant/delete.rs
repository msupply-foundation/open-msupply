use repository::{
    item_variant::packaging_variant_row::PackagingVariantRowRepository, ActivityLogType,
    RepositoryError, TransactionError,
};

use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

#[derive(PartialEq, Debug)]
pub enum DeletePackagingVariantError {
    DatabaseError(RepositoryError),
}

pub struct DeletePackagingVariant {
    pub id: String,
}

pub fn delete_packaging_variant(
    ctx: &ServiceContext,
    input: DeletePackagingVariant,
) -> Result<String, DeletePackagingVariantError> {
    ctx.connection
        .transaction_sync(|connection| {
            // No validation needed for delete, since we have a soft delete
            // If it's already deleted, it's fine to delete again...
            let repo = PackagingVariantRowRepository::new(connection);
            let result = repo.mark_deleted(&input.id)?;

            activity_log_entry(
                ctx,
                ActivityLogType::PackagingVariantDeleted,
                Some(input.id.clone()),
                None,
                None,
            )?;

            Ok(result)
        })
        .map_err(|error: TransactionError<DeletePackagingVariantError>| error.to_inner_error())?;
    Ok(input.id)
}

impl From<RepositoryError> for DeletePackagingVariantError {
    fn from(error: RepositoryError) -> Self {
        DeletePackagingVariantError::DatabaseError(error)
    }
}
