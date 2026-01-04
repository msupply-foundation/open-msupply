use super::UpsertItemVariantWithPackaging;
use crate::{
    invoice_line::validate::check_item_exists,
    item::item_variant::UpsertItemVariantError,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
    NullableUpdate,
};
use repository::{
    item_variant::item_variant::{ItemVariant, ItemVariantFilter, ItemVariantRepository},
    EqualFilter, ItemLinkRowRepository, LocationTypeRowRepository, StorageConnection, StringFilter,
};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpsertItemVariantWithPackaging,
) -> Result<Option<ItemVariant>, UpsertItemVariantError> {
    use UpsertItemVariantError::*;

    check_item_exists(connection, &input.item_id)?.ok_or(ItemDoesNotExist)?;

    let existing_item_variant = ItemVariantRepository::new(connection)
        .query_one(ItemVariantFilter::new().id(EqualFilter::equal_to(input.id.to_string())))?;

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

    if let Some(NullableUpdate {
        value: Some(ref manufacturer_id),
    }) = &input.manufacturer_id
    {
        check_other_party(
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
    };

    if let Some(NullableUpdate {
        value: Some(ref location_type_id),
    }) = &input.location_type_id
    {
        // Check if the location type exists
        let repo = LocationTypeRowRepository::new(connection);
        let location_type = repo.find_one_by_id(location_type_id)?;
        if location_type.is_none() {
            return Err(LocationTypeDoesNotExist);
        }
    };

    // Check for duplicate name under the same item
    let item_variants_with_duplicate_name = ItemVariantRepository::new(connection)
        .query_by_filter(
            ItemVariantFilter::new()
                .name(StringFilter::equal_to(input.name.trim()))
                .item_id(EqualFilter::equal_to(input.item_id.to_string())),
        )?;

    if item_variants_with_duplicate_name
        .iter()
        .any(|v| v.item_variant_row.id != input.id)
    {
        return Err(DuplicateName);
    }

    Ok(existing_item_variant)
}
