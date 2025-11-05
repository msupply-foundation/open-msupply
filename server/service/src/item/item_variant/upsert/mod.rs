use repository::{
    item_variant::{
        item_variant::{ItemVariant, ItemVariantFilter, ItemVariantRepository},
        item_variant_row::ItemVariantRowRepository,
        packaging_variant::{PackagingVariantFilter, PackagingVariantRepository},
        packaging_variant_row::PackagingVariantRowRepository,
    },
    EqualFilter, RepositoryError, TransactionError,
};

use crate::{
    item::packaging_variant::{
        upsert_packaging_variant, UpsertPackagingVariant, UpsertPackagingVariantError,
    },
    service_provider::ServiceContext,
    NullableUpdate,
};
mod generate;
mod validate;
use generate::{generate, generate_logs};
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum UpsertItemVariantError {
    CreatedRecordNotFound,
    ItemDoesNotExist,
    CantChangeItem,
    DuplicateName,
    LocationTypeDoesNotExist,
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotAManufacturer,
    PackagingVariantError(UpsertPackagingVariantError),
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct UpsertItemVariantWithPackaging {
    pub id: String,
    pub item_id: String,
    pub location_type_id: Option<NullableUpdate<String>>,
    pub name: String,
    pub manufacturer_id: Option<NullableUpdate<String>>,
    pub packaging_variants: Vec<UpsertPackagingVariant>,
    pub vvm_type: Option<NullableUpdate<String>>,
}

pub fn upsert_item_variant(
    ctx: &ServiceContext,
    input: UpsertItemVariantWithPackaging,
) -> Result<ItemVariant, UpsertItemVariantError> {
    let item_variant = ctx
        .connection
        .transaction_sync(|connection| {
            let existing_variant = validate(connection, &ctx.store_id, &input)?;
            let new_item_variant = generate(&ctx.user_id, existing_variant.clone(), input.clone());
            let repo = ItemVariantRowRepository::new(connection);
            let packaging_variant_repo = PackagingVariantRepository::new(connection);
            let packaging_variant_row_repo = PackagingVariantRowRepository::new(connection);

            // First upsert the item_variant
            repo.upsert_one(&new_item_variant)?;

            // Get existing packaging variants
            let existing_packaging_variant_ids = packaging_variant_repo
                .query_by_filter(
                    PackagingVariantFilter::new()
                        .item_variant_id(EqualFilter::equal_to(new_item_variant.id.to_string())),
                )?
                .iter()
                .map(|v| v.id.clone())
                .collect::<Vec<String>>();

            // Delete packaging variants that are not in the new list
            for existing_packaging_variant_id in existing_packaging_variant_ids {
                if !input
                    .packaging_variants
                    .clone()
                    .iter()
                    .any(|v| v.id == existing_packaging_variant_id)
                {
                    packaging_variant_row_repo.mark_deleted(&existing_packaging_variant_id)?;
                }
            }

            // Upsert the new packaging variants
            for packaging_variant in input.packaging_variants.clone() {
                upsert_packaging_variant(ctx, packaging_variant)
                    .map_err(UpsertItemVariantError::PackagingVariantError)?;
            }

            let updated_variant = ItemVariantRepository::new(connection)
                .query_one(
                    ItemVariantFilter::new().id(EqualFilter::equal_to(new_item_variant.id.to_string())),
                )?
                .ok_or(UpsertItemVariantError::CreatedRecordNotFound)?;

            generate_logs(ctx, existing_variant, updated_variant.clone())?;

            Ok(updated_variant)
        })
        .map_err(|error: TransactionError<UpsertItemVariantError>| error.to_inner_error())?;

    Ok(item_variant)
}

impl From<RepositoryError> for UpsertItemVariantError {
    fn from(error: RepositoryError) -> Self {
        UpsertItemVariantError::DatabaseError(error)
    }
}
