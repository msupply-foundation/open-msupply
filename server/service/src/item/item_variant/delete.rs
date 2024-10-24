use repository::{
    item_variant::item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
    RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

use super::validate::check_item_variant_exists;

#[derive(PartialEq, Debug)]
pub enum DeleteItemVariantError {
    CouldNotDeleteItemVariant,
    ItemVariantDoesNotExist,
    DatabaseError(RepositoryError),
}

pub struct DeleteItemVariant {
    pub id: String,
}

pub fn delete_item_variant(
    ctx: &ServiceContext,
    input: DeleteItemVariant,
) -> Result<String, DeleteItemVariantError> {
    let item_variant_id = ctx
        .connection
        .transaction_sync(|connection| {
            let item_variant = validate(connection, &input)?;

            let repo = ItemVariantRowRepository::new(connection);
            repo.mark_deleted(&input.id)?;
            repo.find_one_by_id(&item_variant.id)?
                .ok_or(DeleteItemVariantError::CouldNotDeleteItemVariant)
                .map(|item_variant| item_variant.id)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(item_variant_id)
}

impl From<RepositoryError> for DeleteItemVariantError {
    fn from(error: RepositoryError) -> Self {
        DeleteItemVariantError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    DeleteItemVariant { id }: &DeleteItemVariant,
) -> Result<ItemVariantRow, DeleteItemVariantError> {
    let item_variant = check_item_variant_exists(connection, id)?
        .ok_or(DeleteItemVariantError::ItemVariantDoesNotExist)?;

    Ok(item_variant)
}
