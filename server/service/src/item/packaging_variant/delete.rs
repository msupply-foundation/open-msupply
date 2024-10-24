use repository::{
    item_variant::packaging_variant_row::{PackagingVariantRow, PackagingVariantRowRepository},
    RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

use super::validate::check_packaging_variant_exists;

#[derive(PartialEq, Debug)]
pub enum DeletePackagingVariantError {
    CouldNotDeletePackagingVariant,
    PackagingVariantDoesNotExist,
    DatabaseError(RepositoryError),
}

pub struct DeletePackagingVariant {
    pub id: String,
}

pub fn delete_packaging_variant(
    ctx: &ServiceContext,
    input: DeletePackagingVariant,
) -> Result<String, DeletePackagingVariantError> {
    let packaging_variant_id = ctx
        .connection
        .transaction_sync(|connection| {
            let packaging_variant = validate(connection, &input)?;

            let repo = PackagingVariantRowRepository::new(connection);
            repo.mark_deleted(&input.id)?;
            repo.find_one_by_id(&packaging_variant.id)?
                .ok_or(DeletePackagingVariantError::CouldNotDeletePackagingVariant)
                .map(|packaging_variant| packaging_variant.id)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(packaging_variant_id)
}

impl From<RepositoryError> for DeletePackagingVariantError {
    fn from(error: RepositoryError) -> Self {
        DeletePackagingVariantError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    DeletePackagingVariant { id }: &DeletePackagingVariant,
) -> Result<PackagingVariantRow, DeletePackagingVariantError> {
    let packaging_variant = check_packaging_variant_exists(connection, id)?
        .ok_or(DeletePackagingVariantError::PackagingVariantDoesNotExist)?;

    Ok(packaging_variant)
}
