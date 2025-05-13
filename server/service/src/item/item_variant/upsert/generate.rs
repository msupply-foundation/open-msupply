use chrono::Utc;
use repository::{
    item_variant::{item_variant::ItemVariant, item_variant_row::ItemVariantRow},
    ActivityLogType, RepositoryError,
};

use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

use super::UpsertItemVariantWithPackaging;

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

pub fn generate_logs(
    ctx: &ServiceContext,
    existing_variant: Option<ItemVariant>,
    updated_variant: ItemVariant,
) -> Result<(), RepositoryError> {
    if let Some(existing_variant) = (existing_variant) {
        let existing_item_variant = existing_variant.item_variant_row;
        let updated_item_variant = updated_variant.item_variant_row;

        if existing_item_variant.name != updated_item_variant.name {
            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantUpdatedName,
                Some(existing_item_variant.id.clone()),
                Some(existing_item_variant.name.clone()),
                Some(updated_item_variant.name.clone()),
            )?;
        }

        if existing_item_variant.cold_storage_type_id != updated_item_variant.cold_storage_type_id {
            if let (Some(existing_storage_type), Some(updated_storage_type)) = (
                existing_variant.cold_storage_type_row,
                updated_variant.cold_storage_type_row,
            ) {
                activity_log_entry(
                    ctx,
                    ActivityLogType::ItemVariantUpdateColdStorageType,
                    Some(existing_item_variant.id.clone()),
                    Some(existing_storage_type.name.clone()),
                    Some(updated_storage_type.name.clone()),
                )?;
            }
        }

        if existing_item_variant.manufacturer_link_id != updated_item_variant.manufacturer_link_id {
            if let (Some(existing_manufacturer), Some(updated_manufacturer)) = (
                existing_variant.manufacturer_row,
                updated_variant.manufacturer_row,
            ) {
                activity_log_entry(
                    ctx,
                    ActivityLogType::ItemVariantUpdateManufacturer,
                    Some(existing_item_variant.id.clone()),
                    Some(existing_manufacturer.name.clone()),
                    Some(updated_manufacturer.name.clone()),
                )?;
            }
        }

        if existing_item_variant.doses_per_unit != updated_item_variant.doses_per_unit {
            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantUpdateDosePerUnit,
                Some(existing_item_variant.id.clone()),
                Some(existing_item_variant.doses_per_unit.to_string()),
                Some(updated_item_variant.doses_per_unit.to_string()),
            )?;
        }

        if existing_item_variant.vvm_type != updated_item_variant.vvm_type {
            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantUpdateVVMType,
                Some(existing_item_variant.id.clone()),
                Some(existing_item_variant.vvm_type.clone().unwrap_or_default()),
                Some(updated_item_variant.vvm_type.clone().unwrap_or_default()),
            )?;
        }
    } else {
        activity_log_entry(
            ctx,
            ActivityLogType::ItemVariantCreated,
            Some(updated_variant.item_variant_row.id.clone()),
            None,
            None,
        )?;
    }
    Ok(())
}
