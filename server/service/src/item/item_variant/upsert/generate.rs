use chrono::Utc;
use repository::{
    ActivityLogType, RepositoryError,
    item_variant::{item_variant::ItemVariant, item_variant_row::ItemVariantRow},
};

use crate::{activity_log::activity_log_entry_with_diff, service_provider::ServiceContext};

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
    // Editing an auto-created variant leaves it auto-created: only promoting it
    // makes it a real one
    let (created_datetime, created_by, is_auto_created) = match existing_variant {
        Some(ref variant) => (
            variant.item_variant_row.created_datetime,
            variant.item_variant_row.created_by.clone(),
            variant.item_variant_row.is_auto_created,
        ),
        None => (Utc::now().naive_utc(), Some(user_id.to_string()), false),
    };

    ItemVariantRow {
        id,
        name,
        item_id,
        location_type_id: location_type_id.map(|l| l.value).unwrap_or_default(),
        manufacturer_id: manufacturer_id
            .map(|manufacturer_id| manufacturer_id.value)
            .unwrap_or_default(),
        vvm_type: vvm_type.map(|vvm_type| vvm_type.value).unwrap_or_default(),
        created_datetime,
        created_by,
        deleted_datetime: None,
        is_auto_created,
    }
}

pub fn generate_logs(
    ctx: &ServiceContext,
    existing_variant: Option<ItemVariant>,
    updated_variant: ItemVariant,
) -> Result<(), RepositoryError> {
    let existing = existing_variant.map(|v| v.item_variant_row);
    let updated = updated_variant.item_variant_row;

    let log_type = if existing.is_some() {
        ActivityLogType::ItemVariantUpdated
    } else {
        ActivityLogType::ItemVariantCreated
    };
    activity_log_entry_with_diff(
        ctx,
        log_type,
        Some(updated.item_id.clone()),
        existing.as_ref(),
        &updated,
    )?;
    Ok(())
}
