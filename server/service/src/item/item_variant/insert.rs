use repository::{
    item_variant::item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
    RepositoryError, StorageConnection,
};

use crate::{item::check_item_exists, service_provider::ServiceContext};

use super::validate::check_item_variant_exists;

#[derive(PartialEq, Debug)]

pub enum InsertItemVariantError {
    ItemVariantAlreadyExists,
    CreatedRecordNotFound,
    ItemDoesNotExist,
    DatabaseError(RepositoryError),
}

pub struct InsertItemVariant {
    pub id: String,
    pub item_id: String,
    pub cold_storage_type_id: Option<String>,
    pub name: String,
    pub doses_per_unit: Option<i32>,
    pub manufacturer_link_id: Option<String>,
}

pub fn insert_item_variant(
    ctx: &ServiceContext,
    input: InsertItemVariant,
) -> Result<ItemVariantRow, InsertItemVariantError> {
    let item_variant = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input, &ctx.store_id)?;
            let new_item_variant = generate(input);
            let repo = ItemVariantRowRepository::new(connection);
            repo.upsert_one(&new_item_variant)?;

            repo.find_one_by_id(&new_item_variant.id)?
                .ok_or(InsertItemVariantError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(item_variant)
}

impl From<RepositoryError> for InsertItemVariantError {
    fn from(error: RepositoryError) -> Self {
        InsertItemVariantError::DatabaseError(error)
    }
}

pub fn generate(
    InsertItemVariant {
        id,
        name,
        item_id,
        cold_storage_type_id,
        doses_per_unit,
        manufacturer_link_id,
    }: InsertItemVariant,
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
    input: &InsertItemVariant,
    store_id: &str,
) -> Result<(), InsertItemVariantError> {
    if check_item_variant_exists(connection, &input.id)?.is_some() {
        return Err(InsertItemVariantError::ItemVariantAlreadyExists);
    }

    if !check_item_exists(connection, store_id.to_string(), &input.item_id)? {
        return Err(InsertItemVariantError::ItemDoesNotExist);
    }

    Ok(())
}
