use repository::{
    item_variant::packaging_variant_row::{PackagingVariantRow, PackagingVariantRowRepository},
    RepositoryError, StorageConnection,
};

use crate::{item::item_variant::check_item_variant_exists, service_provider::ServiceContext};

use super::validate::check_packaging_variant_exists;

#[derive(PartialEq, Debug)]

pub enum InsertPackagingVariantError {
    PackagingVariantAlreadyExists,
    CreatedRecordNotFound,
    ItemDoesNotExist,
    DatabaseError(RepositoryError),
}

pub struct InsertPackagingVariant {
    pub id: String,
    pub item_variant_id: String,
    pub name: String,
    pub packaging_level: i32,
    pub pack_size: Option<f64>,
    pub volume_per_unit: Option<f64>,
}

pub fn insert_packaging_variant(
    ctx: &ServiceContext,
    input: InsertPackagingVariant,
) -> Result<PackagingVariantRow, InsertPackagingVariantError> {
    let packaging_variant = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_packaging_variant = generate(input);
            let repo = PackagingVariantRowRepository::new(connection);
            repo.upsert_one(&new_packaging_variant)?;

            repo.find_one_by_id(&new_packaging_variant.id)?
                .ok_or(InsertPackagingVariantError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(packaging_variant)
}

impl From<RepositoryError> for InsertPackagingVariantError {
    fn from(error: RepositoryError) -> Self {
        InsertPackagingVariantError::DatabaseError(error)
    }
}

pub fn generate(
    InsertPackagingVariant {
        id,
        name,
        item_variant_id,
        packaging_level,
        pack_size,
        volume_per_unit,
    }: InsertPackagingVariant,
) -> PackagingVariantRow {
    PackagingVariantRow {
        id,
        name,
        item_variant_id,
        packaging_level,
        pack_size,
        volume_per_unit,
        deleted_datetime: None,
    }
}

fn validate(
    connection: &StorageConnection,
    input: &InsertPackagingVariant,
) -> Result<(), InsertPackagingVariantError> {
    if check_packaging_variant_exists(connection, &input.id)?.is_some() {
        return Err(InsertPackagingVariantError::PackagingVariantAlreadyExists);
    }

    let item_variant = check_item_variant_exists(connection, &input.item_variant_id)?;
    if item_variant.is_none() {
        return Err(InsertPackagingVariantError::ItemDoesNotExist);
    }

    Ok(())
}
