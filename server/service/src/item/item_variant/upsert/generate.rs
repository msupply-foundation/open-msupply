use chrono::Utc;
use repository::{
    item_variant::{item_variant::ItemVariant, item_variant_row::ItemVariantRow},
    ActivityLogType, RepositoryError,
};

use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

use super::UpsertItemVariantWithPackaging;

pub fn generate(
    user_id: &str,
    existing_variant: Option<ItemVariant>,
    UpsertItemVariantWithPackaging {
        id,
        name,
        item_id,
        location_type_id,
        manufacturer_id,
        packaging_variants: _, // Mapped separately
        vvm_type,
    }: UpsertItemVariantWithPackaging,
) -> ItemVariantRow {
    let (created_datetime, created_by) = match existing_variant {
        Some(ref variant) => (
            variant.item_variant_row.created_datetime,
            variant.item_variant_row.created_by.clone(),
        ),
        None => (Utc::now().naive_utc(), Some(user_id.to_string())),
    };

    ItemVariantRow {
        id,
        name,
        item_link_id: item_id,
        location_type_id: location_type_id.map(|l| l.value).unwrap_or_default(),
        manufacturer_id: manufacturer_id
            .map(|manufacturer_id| manufacturer_id.value)
            .unwrap_or_default(),
        vvm_type: vvm_type.map(|vvm_type| vvm_type.value).unwrap_or_default(),
        created_datetime,
        created_by,
        deleted_datetime: None,
    }
}

pub fn generate_logs(
    ctx: &ServiceContext,
    existing_variant: Option<ItemVariant>,
    updated_variant: ItemVariant,
) -> Result<(), RepositoryError> {
    if let Some(existing_variant) = existing_variant {
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

        if existing_item_variant.location_type_id != updated_item_variant.location_type_id {
            let existing_variant_name: Option<String> = existing_variant
                .location_type_row
                .map(|row| row.name.clone());
            let updated_variant_name = updated_variant
                .location_type_row
                .map(|row| row.name.clone());

            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantUpdateLocationType,
                Some(existing_item_variant.id.clone()),
                existing_variant_name,
                updated_variant_name,
            )?;
        }

        if existing_item_variant.manufacturer_id != updated_item_variant.manufacturer_id {
            let existing_manufacturer_name = existing_variant
                .manufacturer_row
                .map(|row| row.name.clone());
            let updated_manufacturer_name =
                updated_variant.manufacturer_row.map(|row| row.name.clone());

            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantUpdateManufacturer,
                Some(existing_item_variant.id.clone()),
                existing_manufacturer_name,
                updated_manufacturer_name,
            )?;
        }

        if existing_item_variant.vvm_type != updated_item_variant.vvm_type {
            activity_log_entry(
                ctx,
                ActivityLogType::ItemVariantUpdateVVMType,
                Some(existing_item_variant.id.clone()),
                existing_item_variant.vvm_type.clone(),
                updated_item_variant.vvm_type.clone(),
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
