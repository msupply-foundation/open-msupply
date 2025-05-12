use chrono::Utc;
use repository::{
    item_variant::{
        item_variant::{ItemVariant, ItemVariantFilter, ItemVariantRepository},
        item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
        packaging_variant::{PackagingVariantFilter, PackagingVariantRepository},
        packaging_variant_row::PackagingVariantRowRepository,
    },
    ActivityLogType, ColdStorageTypeRow, ColdStorageTypeRowRepository, EqualFilter,
    ItemLinkRowRepository, NameRow, RepositoryError, StorageConnection, StringFilter,
};

use crate::{
    activity_log::activity_log_entry,
    invoice_line::validate::check_item_exists,
    item::packaging_variant::{
        upsert_packaging_variant, UpsertPackagingVariant, UpsertPackagingVariantError,
    },
    service_provider::ServiceContext,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
    NullableUpdate,
};

#[derive(PartialEq, Debug)]
pub enum UpsertItemVariantError {
    CreatedRecordNotFound,
    ItemDoesNotExist,
    CantChangeItem,
    DuplicateName,
    ColdStorageTypeDoesNotExist,
    DoseConfigurationNotAllowed,
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
    pub cold_storage_type_id: Option<NullableUpdate<String>>,
    pub name: String,
    pub manufacturer_id: Option<NullableUpdate<String>>,
    pub packaging_variants: Vec<UpsertPackagingVariant>,
    pub doses_per_unit: i32,
    pub vvm_type: Option<NullableUpdate<String>>,
}

pub fn upsert_item_variant(
    ctx: &ServiceContext,
    input: UpsertItemVariantWithPackaging,
) -> Result<ItemVariant, UpsertItemVariantError> {
    let item_variant = ctx
        .connection
        .transaction_sync(|connection| {
            let ValidateResult {
                existing_item_variant,
                cold_storage_type,
                manufacturer,
            } = validate(connection, &ctx.store_id, &input)?;
            let new_item_variant = generate(&ctx.user_id, input.clone());
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
            for packaging_variant in input.packaging_variants.clone() {
                upsert_packaging_variant(ctx, packaging_variant)
                    .map_err(UpsertItemVariantError::PackagingVariantError)?;
            }

            generate_logs(
                ctx,
                existing_item_variant,
                new_item_variant.clone(),
                cold_storage_type,
                manufacturer,
                input,
            )?;

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
    user_id: &str,
    UpsertItemVariantWithPackaging {
        id,
        name,
        item_id,
        cold_storage_type_id,
        manufacturer_id,
        packaging_variants: _, // Mapped separately
        doses_per_unit,
        vvm_type,
    }: UpsertItemVariantWithPackaging,
) -> ItemVariantRow {
    ItemVariantRow {
        id,
        name,
        item_link_id: item_id,
        cold_storage_type_id: cold_storage_type_id.map(|l| l.value).unwrap_or_default(),
        manufacturer_link_id: manufacturer_id
            .map(|manufacturer_id| manufacturer_id.value)
            .unwrap_or_default(),
        deleted_datetime: None,
        doses_per_unit,
        vvm_type: vvm_type.map(|vvm_type| vvm_type.value).unwrap_or_default(),
        created_datetime: Utc::now().naive_utc(),
        created_by: Some(user_id.to_string()),
    }
}

struct ValidateResult {
    pub existing_item_variant: Option<ItemVariant>,
    pub cold_storage_type: Option<ColdStorageTypeRow>,
    pub manufacturer: Option<NameRow>,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpsertItemVariantWithPackaging,
) -> Result<ValidateResult, UpsertItemVariantError> {
    use UpsertItemVariantError::*;

    let item = check_item_exists(connection, &input.item_id)?.ok_or(ItemDoesNotExist)?;

    let existing_item_variant = ItemVariantRepository::new(connection)
        .query_one(ItemVariantFilter::new().id(EqualFilter::equal_to(&input.id)))?;

    if let Some(existing_item_variant) = existing_item_variant.clone() {
        // Query Item Link to check if the item_id is the same
        // If items have been merged, the item_id could be different, but we still want to update the row so we have the latest id
        let old_item_id = ItemLinkRowRepository::new(connection)
            .find_one_by_id(&existing_item_variant.item_variant_row.item_link_id)?
            .map(|v| v.item_id)
            .unwrap_or_else(|| existing_item_variant.item_variant_row.item_link_id.clone());

        if old_item_id != input.item_id {
            return Err(CantChangeItem);
        }
    }

    let manufacturer = if let Some(NullableUpdate {
        value: Some(ref manufacturer_id),
    }) = &input.manufacturer_id
    {
        let other_party = check_other_party(
            connection,
            store_id,
            manufacturer_id,
            CheckOtherPartyType::Manufacturer,
        )
        .map_err(|e| match e {
            OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
            OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
            OtherPartyErrors::TypeMismatched => OtherPartyNotAManufacturer,
            OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
        })?;
        Some(other_party.name_row)
    } else {
        None
    };

    let cold_storage_type = if let Some(NullableUpdate {
        value: Some(ref cold_storage_type_id),
    }) = &input.cold_storage_type_id
    {
        // Check if the cold storage type exists
        let repo = ColdStorageTypeRowRepository::new(connection);
        let cold_storage_type = repo.find_one_by_id(cold_storage_type_id)?;
        if cold_storage_type.is_none() {
            return Err(ColdStorageTypeDoesNotExist);
        }
        cold_storage_type
    } else {
        None
    };

    // Check for duplicate name under the same item
    let item_variants_with_duplicate_name = ItemVariantRepository::new(connection)
        .query_by_filter(
            ItemVariantFilter::new()
                .name(StringFilter::equal_to(input.name.trim()))
                .item_id(EqualFilter::equal_to(&input.item_id)),
        )?;

    if item_variants_with_duplicate_name
        .iter()
        .any(|v| v.item_variant_row.id != input.id)
    {
        return Err(DuplicateName);
    }

    if !item.is_vaccine && input.doses_per_unit > 0 {
        return Err(DoseConfigurationNotAllowed);
    }

    Ok(ValidateResult {
        existing_item_variant,
        cold_storage_type,
        manufacturer,
    })
}

fn generate_logs(
    ctx: &ServiceContext,
    existing_item_variant: Option<ItemVariant>,
    new_item_variant: ItemVariantRow,
    cold_storage_type: Option<ColdStorageTypeRow>,
    manufacturer: Option<NameRow>,
    UpsertItemVariantWithPackaging {
        name,
        doses_per_unit,
        vvm_type,
        id: _,
        item_id: _,
        cold_storage_type_id: _,
        manufacturer_id: _,
        packaging_variants: _, // Mapped separately
    }: UpsertItemVariantWithPackaging,
) -> Result<(), RepositoryError> {
    if let Some(existing_variant) = existing_item_variant {
        let item_variant = existing_variant.item_variant_row;

        if item_variant.name != name {
            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantUpdatedName,
                Some(item_variant.id.clone()),
                Some(item_variant.name.clone()),
                Some(name.clone()),
            )?;
        }

        if let (Some(input_storage_type), Some(existing_storage_type_id)) =
            (cold_storage_type, item_variant.cold_storage_type_id)
        {
            if input_storage_type.id != existing_storage_type_id {
                let existing_storage_type_name = ColdStorageTypeRowRepository::new(&ctx.connection)
                    .find_one_by_id(&existing_storage_type_id)?
                    .map(|v| v.name)
                    .unwrap_or_default();

                activity_log_entry(
                    ctx,
                    ActivityLogType::ItemVariantUpdateColdStorageType,
                    Some(item_variant.id.clone()),
                    Some(existing_storage_type_name),
                    Some(input_storage_type.name),
                )?;
            }
        }

        if let (Some(input_manufacturer), Some(existing_manufacturer)) =
            (manufacturer, existing_variant.manufacturer_row)
        {
            if input_manufacturer.id != existing_manufacturer.id {
                activity_log_entry(
                    ctx,
                    ActivityLogType::ItemVariantUpdateManufacturer,
                    Some(item_variant.id.clone()),
                    Some(existing_manufacturer.name.clone()),
                    Some(input_manufacturer.name.clone()),
                )?;
            }
        }

        if item_variant.doses_per_unit != doses_per_unit {
            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantUpdateDosePerUnit,
                Some(item_variant.id.clone()),
                Some(item_variant.doses_per_unit.to_string()),
                Some(doses_per_unit.to_string()),
            )?;
        }

        if let Some(NullableUpdate {
            value: Some(vvm_type),
        }) = &vvm_type
        {
            if item_variant.vvm_type.as_ref() != Some(vvm_type) {
                activity_log_entry(
                    ctx,
                    ActivityLogType::ItemVariantUpdateVVMType,
                    Some(item_variant.id.clone()),
                    Some(item_variant.vvm_type.clone().unwrap_or_default()),
                    Some(vvm_type.clone()),
                )?;
            }
        }
    } else {
        activity_log_entry(
            ctx,
            ActivityLogType::ItemVariantCreated,
            Some(new_item_variant.id.clone()),
            None,
            None,
        )?;
    }
    Ok(())
}
