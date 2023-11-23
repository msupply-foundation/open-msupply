use repository::{
    PackVariant, PackVariantRow, PackVariantRowRepository, RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

use super::validate::check_pack_variant_exists;

#[derive(PartialEq, Debug)]
pub enum UpdatePackVariantError {
    CannotHaveNoAbbreviationAndName,
    PackVariantDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct UpdatePackVariant {
    pub id: String,
    pub short_name: String,
    pub long_name: String,
}

pub fn update_pack_variant(
    ctx: &ServiceContext,
    input: UpdatePackVariant,
) -> Result<PackVariant, UpdatePackVariantError> {
    let pack_variant = ctx
        .connection
        .transaction_sync(|connection| {
            let pack_variant_row = validate(connection, &input)?;
            let updated_pack_variant = generate(input, pack_variant_row);
            let repo = PackVariantRowRepository::new(&connection);
            repo.upsert_one(&updated_pack_variant)?;

            repo.find_one_by_id(&updated_pack_variant.id)?
                .ok_or(UpdatePackVariantError::UpdatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(pack_variant)
}

impl From<RepositoryError> for UpdatePackVariantError {
    fn from(error: RepositoryError) -> Self {
        UpdatePackVariantError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpdatePackVariant,
) -> Result<PackVariantRow, UpdatePackVariantError> {
    let pack_variant_row = check_pack_variant_exists(connection, &input.id)?
        .ok_or(UpdatePackVariantError::PackVariantDoesNotExist)?;

    if input.short_name.is_empty() || input.long_name.is_empty() {
        return Err(UpdatePackVariantError::CannotHaveNoAbbreviationAndName);
    }

    Ok(pack_variant_row)
}

fn generate(
    UpdatePackVariant {
        id: _,
        short_name,
        long_name,
    }: UpdatePackVariant,
    mut pack_variant_row: PackVariantRow,
) -> PackVariantRow {
    pack_variant_row.short_name = short_name;
    pack_variant_row.long_name = long_name;
    pack_variant_row
}
