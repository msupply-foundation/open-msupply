use repository::{
    item_variant::{
        item_variant::{ItemVariant, ItemVariantFilter, ItemVariantRepository},
        item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
        packaging_variant::{PackagingVariantFilter, PackagingVariantRepository},
        packaging_variant_row::PackagingVariantRowRepository,
    },
    ColdStorageTypeRowRepository, EqualFilter, ItemLinkRowRepository, RepositoryError,
    StorageConnection, StringFilter,
};

use crate::{
    item::{
        check_item_exists,
        packaging_variant::{
            upsert_packaging_variant, UpsertPackagingVariant, UpsertPackagingVariantError,
        },
    },
    service_provider::ServiceContext,
};

#[derive(PartialEq, Debug)]
pub enum UpsertItemVariantError {
    CreatedRecordNotFound,
    ItemDoesNotExist,
    CantChangeItem,
    DuplicateName,
    ColdStorageTypeDoesNotExist,
    PackagingVariantError(UpsertPackagingVariantError),
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct UpsertItemVariantWithPackaging {
    pub id: String,
    pub item_id: String,
    pub cold_storage_type_id: Option<String>,
    pub name: String,
    pub manufacturer_id: Option<String>,
    pub packaging_variants: Vec<UpsertPackagingVariant>,
}

pub fn upsert_item_variant(
    ctx: &ServiceContext,
    input: UpsertItemVariantWithPackaging,
) -> Result<ItemVariant, UpsertItemVariantError> {
    let item_variant = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input, &ctx.store_id)?;
            let new_item_variant = generate(input.clone());
            let repo = ItemVariantRowRepository::new(connection);
            let packaging_variant_repo = PackagingVariantRepository::new(connection);
            let packaging_variant_row_repo = PackagingVariantRowRepository::new(connection);

            // First upsert the item_variant
            repo.upsert_one(&new_item_variant)?;

            // Get existing packaging variants
            let existing_packaging_variant_ids = packaging_variant_repo
                .query_by_filter(
                    PackagingVariantFilter::new()
                        .item_variant_id(EqualFilter::equal_to(&new_item_variant.id)),
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
            for packaging_variant in input.packaging_variants {
                upsert_packaging_variant(ctx, packaging_variant)
                    .map_err(|e| UpsertItemVariantError::PackagingVariantError(e))?;
            }

            ItemVariantRepository::new(connection)
                .query_one(
                    ItemVariantFilter::new().id(EqualFilter::equal_to(&new_item_variant.id)),
                )?
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
    UpsertItemVariantWithPackaging {
        id,
        name,
        item_id,
        cold_storage_type_id,
        manufacturer_id,
        packaging_variants: _, // Mapped separately
    }: UpsertItemVariantWithPackaging,
) -> ItemVariantRow {
    ItemVariantRow {
        id,
        name,
        item_link_id: item_id,
        cold_storage_type_id,
        manufacturer_link_id: manufacturer_id,
        deleted_datetime: None,
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpsertItemVariantWithPackaging,
    store_id: &str,
) -> Result<(), UpsertItemVariantError> {
    if !check_item_exists(connection, store_id.to_string(), &input.item_id)? {
        return Err(UpsertItemVariantError::ItemDoesNotExist);
    }

    let old_item_variant = ItemVariantRowRepository::new(connection).find_one_by_id(&input.id)?;

    if let Some(old_item_variant) = old_item_variant {
        // Query Item Link to check if the item_id is the same
        // If items have been merged, the item_id could be different, but we still want to update the row so we have the latest id
        let old_item_id = ItemLinkRowRepository::new(connection)
            .find_one_by_id(&old_item_variant.item_link_id)?
            .map(|v| v.item_id)
            .unwrap_or_else(|| old_item_variant.item_link_id.clone());

        if old_item_id != input.item_id {
            return Err(UpsertItemVariantError::CantChangeItem);
        }
    }

    if let Some(cold_storage_type_id) = &input.cold_storage_type_id {
        // Check if the cold storage type exists
        let repo = ColdStorageTypeRowRepository::new(connection);
        let cold_storage_type = repo.find_one_by_id(cold_storage_type_id)?;
        if cold_storage_type.is_none() {
            return Err(UpsertItemVariantError::ColdStorageTypeDoesNotExist);
        }
    }

    // Check for duplicate name under the same item
    let item_variants_with_duplicate_name = ItemVariantRepository::new(connection)
        .query_by_filter(
            ItemVariantFilter::new()
                .name(StringFilter::equal_to(&input.name.trim()))
                .item_id(EqualFilter::equal_to(&input.item_id)),
        )?;

    if item_variants_with_duplicate_name
        .iter()
        .find(|v| v.item_variant_row.id != input.id)
        .is_some()
    {
        return Err(UpsertItemVariantError::DuplicateName);
    }

    Ok(())
}
