use repository::{PackVariantRow, PackVariantRowRepository, RepositoryError, StorageConnection};

use crate::service_provider::ServiceContext;

use super::validate::check_pack_variant_exists;

#[derive(PartialEq, Debug)]
pub enum DeletePackVariantError {
    CouldNotDeletePackVariant,
    PackVariantDoesNotExist,
    DatabaseError(RepositoryError),
}

pub struct DeletePackVariant {
    pub id: String,
}

pub fn delete_pack_variant(
    ctx: &ServiceContext,
    input: DeletePackVariant,
) -> Result<String, DeletePackVariantError> {
    let pack_variant_id = ctx
        .connection
        .transaction_sync(|connection| {
            let existing_pack_variant = validate(connection, &input)?;
            let pack_variant = generate(existing_pack_variant, input);

            let repo = PackVariantRowRepository::new(&connection);
            repo.upsert_one(&pack_variant)?;

            repo.find_one_by_id(&pack_variant.id)?
                .ok_or(DeletePackVariantError::CouldNotDeletePackVariant)
                .map(|pack_variant| pack_variant.id)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(pack_variant_id)
}

impl From<RepositoryError> for DeletePackVariantError {
    fn from(error: RepositoryError) -> Self {
        DeletePackVariantError::DatabaseError(error)
    }
}

fn generate(
    existing_pack_variant: PackVariantRow,
    DeletePackVariant { id: _ }: DeletePackVariant,
) -> PackVariantRow {
    PackVariantRow {
        is_active: false,
        ..existing_pack_variant
    }
}

fn validate(
    connection: &StorageConnection,
    DeletePackVariant { id }: &DeletePackVariant,
) -> Result<PackVariantRow, DeletePackVariantError> {
    let pack_variant = check_pack_variant_exists(connection, id)?
        .ok_or(DeletePackVariantError::PackVariantDoesNotExist)?;

    Ok(pack_variant)
}
