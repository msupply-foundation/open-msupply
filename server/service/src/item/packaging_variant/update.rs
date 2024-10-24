use repository::{
    item_variant::packaging_variant_row::{PackagingVariantRow, PackagingVariantRowRepository},
    RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

use super::validate::check_packaging_variant_exists;

#[derive(PartialEq, Debug)]
pub enum UpdatePackagingVariantError {
    PackagingVariantDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct UpdatePackagingVariant {
    pub id: String,
    pub name: Option<String>,
    pub packaging_level: Option<i32>,
    pub pack_size: Option<f64>,
    pub volume_per_unit: Option<f64>,
}

pub fn update_packaging_variant(
    ctx: &ServiceContext,
    input: UpdatePackagingVariant,
) -> Result<PackagingVariantRow, UpdatePackagingVariantError> {
    let packaging_variant = ctx
        .connection
        .transaction_sync(|connection| {
            let packaging_variant_row = validate(connection, &input)?;
            let updated_packaging_variant = generate(input, packaging_variant_row);
            let repo = PackagingVariantRowRepository::new(connection);
            repo.upsert_one(&updated_packaging_variant)?;

            repo.find_one_by_id(&updated_packaging_variant.id)?
                .ok_or(UpdatePackagingVariantError::UpdatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(packaging_variant)
}

impl From<RepositoryError> for UpdatePackagingVariantError {
    fn from(error: RepositoryError) -> Self {
        UpdatePackagingVariantError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpdatePackagingVariant,
) -> Result<PackagingVariantRow, UpdatePackagingVariantError> {
    let packaging_variant_row = check_packaging_variant_exists(connection, &input.id)?
        .ok_or(UpdatePackagingVariantError::PackagingVariantDoesNotExist)?;

    Ok(packaging_variant_row)
}

fn generate(
    UpdatePackagingVariant {
        id: _,
        name,
        packaging_level,
        pack_size,
        volume_per_unit,
    }: UpdatePackagingVariant,
    mut packaging_variant_row: PackagingVariantRow,
) -> PackagingVariantRow {
    packaging_variant_row.name = name.unwrap_or_else(|| packaging_variant_row.name.clone());
    packaging_variant_row.packaging_level =
        packaging_level.unwrap_or_else(|| packaging_variant_row.packaging_level);
    packaging_variant_row.pack_size = pack_size.or(packaging_variant_row.pack_size);
    packaging_variant_row.volume_per_unit =
        volume_per_unit.or(packaging_variant_row.volume_per_unit);

    packaging_variant_row
}
