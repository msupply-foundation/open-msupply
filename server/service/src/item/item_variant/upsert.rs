use repository::{
    item_variant::item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
    RepositoryError, StorageConnection,
};

use crate::{item::check_item_exists, service_provider::ServiceContext};

#[derive(PartialEq, Debug)]

pub enum UpsertItemVariantError {
    CreatedRecordNotFound,
    ItemDoesNotExist,
    DatabaseError(RepositoryError),
}

pub struct UpsertItemVariant {
    pub id: String,
    pub item_id: String,
    pub cold_storage_type_id: Option<String>,
    pub name: String,
    pub doses_per_unit: Option<i32>,
    pub manufacturer_link_id: Option<String>,
}

pub fn upsert_item_variant(
    ctx: &ServiceContext,
    input: UpsertItemVariant,
) -> Result<ItemVariantRow, UpsertItemVariantError> {
    let item_variant = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input, &ctx.store_id)?;
            let new_item_variant = generate(input);
            let repo = ItemVariantRowRepository::new(connection);
            repo.upsert_one(&new_item_variant)?;

            repo.find_one_by_id(&new_item_variant.id)?
                .ok_or(UpsertItemVariantError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(item_variant)
}

impl From<RepositoryError> for UpsertItemVariantError {
    fn from(error: RepositoryError) -> Self {
        UpsertItemVariantError::DatabaseError(error)
    }
}

pub fn generate(
    UpsertItemVariant {
        id,
        name,
        item_id,
        cold_storage_type_id,
        doses_per_unit,
        manufacturer_link_id,
    }: UpsertItemVariant,
) -> ItemVariantRow {
    ItemVariantRow {
        id,
        name,
        item_link_id: item_id,
        cold_storage_type_id,
        doses_per_unit,
        manufacturer_link_id,
        deleted_datetime: None,
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpsertItemVariant,
    store_id: &str,
) -> Result<(), UpsertItemVariantError> {
    if !check_item_exists(connection, store_id.to_string(), &input.item_id)? {
        return Err(UpsertItemVariantError::ItemDoesNotExist);
    }

    Ok(())
}
