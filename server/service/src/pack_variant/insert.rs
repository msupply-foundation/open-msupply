use repository::{
    PackVariant, PackVariantRow, PackVariantRowRepository, RepositoryError, StorageConnection,
};

use crate::{item::check_item_exists, service_provider::ServiceContext};

use super::validate::{check_pack_size_is_unique, check_pack_variant_exists};

#[derive(PartialEq, Debug)]

pub enum InsertPackVariantError {
    VariantWithPackSizeAlreadyExists,
    PackVariantAlreadyExists,
    CreatedRecordNotFound,
    ItemDoesNotExist,
    CannotAddPackSizeOfZero,
    CannotAddWithNoAbbreviationAndName,
    DatabaseError(RepositoryError),
}

pub struct InsertPackVariant {
    pub id: String,
    pub item_id: String,
    pub pack_size: f64,
    pub short_name: String,
    pub long_name: String,
}

pub fn insert_pack_variant(
    ctx: &ServiceContext,
    input: InsertPackVariant,
) -> Result<PackVariant, InsertPackVariantError> {
    let pack_variant = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input, &ctx.store_id)?;
            let new_pack_variant = generate(input);
            let repo = PackVariantRowRepository::new(connection);
            repo.upsert_one(&new_pack_variant)?;

            repo.find_one_by_id(&new_pack_variant.id)?
                .ok_or(InsertPackVariantError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(pack_variant)
}

impl From<RepositoryError> for InsertPackVariantError {
    fn from(error: RepositoryError) -> Self {
        InsertPackVariantError::DatabaseError(error)
    }
}

pub fn generate(
    InsertPackVariant {
        id,
        item_id,
        pack_size,
        short_name,
        long_name,
    }: InsertPackVariant,
) -> PackVariantRow {
    PackVariantRow {
        id,
        item_id,
        pack_size,
        short_name,
        long_name,
        is_active: true,
    }
}

fn validate(
    connection: &StorageConnection,
    input: &InsertPackVariant,
    store_id: &str,
) -> Result<(), InsertPackVariantError> {
    if check_pack_variant_exists(connection, &input.id)?.is_some() {
        return Err(InsertPackVariantError::PackVariantAlreadyExists);
    }

    if !check_pack_size_is_unique(connection, &input.item_id, input.pack_size)? {
        return Err(InsertPackVariantError::VariantWithPackSizeAlreadyExists);
    }

    if input.pack_size == 0.0 {
        return Err(InsertPackVariantError::CannotAddPackSizeOfZero);
    }

    if input.short_name.is_empty() || input.long_name.is_empty() {
        return Err(InsertPackVariantError::CannotAddWithNoAbbreviationAndName);
    }

    if !check_item_exists(connection, store_id.to_string(), &input.item_id)? {
        return Err(InsertPackVariantError::ItemDoesNotExist);
    }

    Ok(())
}
