use repository::{
    item_variant::item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
    RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

use super::validate::check_item_variant_exists;

#[derive(PartialEq, Debug)]
pub enum UpdateItemVariantError {
    ItemVariantDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct UpdateItemVariant {
    pub id: String,
    pub name: Option<String>,
    pub doses_per_unit: Option<i32>,
    pub manufacturer_id: Option<String>,
}

pub fn update_item_variant(
    ctx: &ServiceContext,
    input: UpdateItemVariant,
) -> Result<ItemVariantRow, UpdateItemVariantError> {
    let item_variant = ctx
        .connection
        .transaction_sync(|connection| {
            let item_variant_row = validate(connection, &input)?;
            let updated_item_variant = generate(input, item_variant_row);
            let repo = ItemVariantRowRepository::new(connection);
            repo.upsert_one(&updated_item_variant)?;

            repo.find_one_by_id(&updated_item_variant.id)?
                .ok_or(UpdateItemVariantError::UpdatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(item_variant)
}

impl From<RepositoryError> for UpdateItemVariantError {
    fn from(error: RepositoryError) -> Self {
        UpdateItemVariantError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpdateItemVariant,
) -> Result<ItemVariantRow, UpdateItemVariantError> {
    let item_variant_row = check_item_variant_exists(connection, &input.id)?
        .ok_or(UpdateItemVariantError::ItemVariantDoesNotExist)?;

    // TODO: Check if manufacturer exists

    Ok(item_variant_row)
}

fn generate(
    UpdateItemVariant {
        id: _,
        name,
        doses_per_unit,
        manufacturer_id,
    }: UpdateItemVariant,
    mut item_variant_row: ItemVariantRow,
) -> ItemVariantRow {
    item_variant_row.name = name.unwrap_or_else(|| item_variant_row.name.clone());
    item_variant_row.doses_per_unit = doses_per_unit.or(item_variant_row.doses_per_unit);
    item_variant_row.manufacturer_link_id =
        manufacturer_id.or(item_variant_row.manufacturer_link_id);

    item_variant_row
}
