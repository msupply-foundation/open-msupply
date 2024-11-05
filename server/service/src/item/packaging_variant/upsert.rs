use repository::{
    item_variant::packaging_variant_row::{PackagingVariantRow, PackagingVariantRowRepository},
    RepositoryError, StorageConnection,
};

use crate::{check_item_variant_exists, service_provider::ServiceContext};

#[derive(PartialEq, Debug)]
pub enum UpsertPackagingVariantError {
    CreatedRecordNotFound,
    ItemVariantDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct UpsertPackagingVariant {
    pub id: String,
    pub item_variant_id: String,
    pub name: String,
    pub packaging_level: i32,
    pub pack_size: Option<f64>,
    pub volume_per_unit: Option<f64>,
}

pub fn upsert_packaging_variant(
    ctx: &ServiceContext,
    input: UpsertPackagingVariant,
) -> Result<PackagingVariantRow, UpsertPackagingVariantError> {
    let packaging_variant = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_packaging_variant = generate(input);
            let repo = PackagingVariantRowRepository::new(connection);
            repo.upsert_one(&new_packaging_variant)?;

            repo.find_one_by_id(&new_packaging_variant.id)?
                .ok_or(UpsertPackagingVariantError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(packaging_variant)
}

impl From<RepositoryError> for UpsertPackagingVariantError {
    fn from(error: RepositoryError) -> Self {
        UpsertPackagingVariantError::DatabaseError(error)
    }
}

pub fn generate(
    UpsertPackagingVariant {
        id,
        name,
        item_variant_id,
        packaging_level,
        pack_size,
        volume_per_unit,
    }: UpsertPackagingVariant,
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
    input: &UpsertPackagingVariant,
) -> Result<(), UpsertPackagingVariantError> {
    if check_item_variant_exists(connection, &input.item_variant_id)?.is_none() {
        return Err(UpsertPackagingVariantError::ItemVariantDoesNotExist);
    }

    Ok(())
}
