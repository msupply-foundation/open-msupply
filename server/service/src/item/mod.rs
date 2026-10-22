pub mod ancillary_item;
pub mod bundled_item;
pub mod item;
pub mod item_variant;
pub mod packaging_variant;
use ancillary_item::{
    DeleteAncillaryItem, DeleteAncillaryItemError, SetSupplyWastageRate,
    SetSupplyWastageRateError, UpsertAncillaryItem, UpsertAncillaryItemError,
    delete_ancillary_item, get_ancillary_items, set_supply_wastage_rate, upsert_ancillary_item,
};
use bundled_item::{
    DeleteBundledItem, DeleteBundledItemError, UpsertBundledItem, UpsertBundledItemError,
    delete_bundled_item, get_bundled_items, upsert_bundled_item,
};
pub use item::*;
use item_variant::{
    DeleteItemVariant, DeleteItemVariantError, PromoteItemVariantError, UpsertItemVariantError,
    UpsertItemVariantWithPackaging, delete_item_variant, get_item_variants, promote_item_variant,
    upsert_item_variant,
};
use packaging_variant::{
    DeletePackagingVariant, DeletePackagingVariantError, UpsertPackagingVariant,
    UpsertPackagingVariantError, delete_packaging_variant, get_packaging_variants,
    upsert_packaging_variant,
};
use repository::{
    PaginationOption,
    ancillary_item::AncillaryItemFilter,
    ancillary_item_row::AncillaryItemRow,
    item_variant::{
        bundled_item::BundledItemFilter,
        bundled_item_row::BundledItemRow,
        item_variant::{ItemVariant, ItemVariantFilter, ItemVariantSort},
        packaging_variant::{PackagingVariantFilter, PackagingVariantSort},
        packaging_variant_row::PackagingVariantRow,
    },
};

use crate::{ListError, ListResult, service_provider::ServiceContext};

pub trait ItemServiceTrait: Sync + Send {
    fn get_item_variants(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<ItemVariantFilter>,
        sort: Option<ItemVariantSort>,
    ) -> Result<ListResult<ItemVariant>, ListError> {
        get_item_variants(&ctx.connection, pagination, filter, sort)
    }

    fn upsert_item_variant(
        &self,
        ctx: &ServiceContext,
        input: UpsertItemVariantWithPackaging,
    ) -> Result<ItemVariant, UpsertItemVariantError> {
        upsert_item_variant(ctx, input)
    }

    fn delete_item_variant(
        &self,
        ctx: &ServiceContext,
        input: DeleteItemVariant,
    ) -> Result<String, DeleteItemVariantError> {
        delete_item_variant(ctx, input)
    }

    fn promote_item_variant(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<ItemVariant, PromoteItemVariantError> {
        promote_item_variant(ctx, id)
    }

    fn get_packaging_variants(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<PackagingVariantFilter>,
        sort: Option<PackagingVariantSort>,
    ) -> Result<ListResult<PackagingVariantRow>, ListError> {
        get_packaging_variants(&ctx.connection, pagination, filter, sort)
    }

    fn upsert_packaging_variant(
        &self,
        ctx: &ServiceContext,
        input: UpsertPackagingVariant,
    ) -> Result<PackagingVariantRow, UpsertPackagingVariantError> {
        upsert_packaging_variant(ctx, input)
    }

    fn delete_packaging_variant(
        &self,
        ctx: &ServiceContext,
        input: DeletePackagingVariant,
    ) -> Result<String, DeletePackagingVariantError> {
        delete_packaging_variant(ctx, input)
    }

    fn get_bundled_items(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<BundledItemFilter>,
    ) -> Result<ListResult<BundledItemRow>, ListError> {
        get_bundled_items(&ctx.connection, pagination, filter)
    }

    fn upsert_bundled_item(
        &self,
        ctx: &ServiceContext,
        input: UpsertBundledItem,
    ) -> Result<BundledItemRow, UpsertBundledItemError> {
        upsert_bundled_item(ctx, input)
    }

    fn delete_bundled_item(
        &self,
        ctx: &ServiceContext,
        input: DeleteBundledItem,
    ) -> Result<String, DeleteBundledItemError> {
        delete_bundled_item(ctx, input)
    }

    fn get_ancillary_items(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<AncillaryItemFilter>,
    ) -> Result<ListResult<AncillaryItemRow>, ListError> {
        get_ancillary_items(&ctx.connection, pagination, filter)
    }

    fn upsert_ancillary_item(
        &self,
        ctx: &ServiceContext,
        input: UpsertAncillaryItem,
    ) -> Result<AncillaryItemRow, UpsertAncillaryItemError> {
        upsert_ancillary_item(ctx, input)
    }

    fn delete_ancillary_item(
        &self,
        ctx: &ServiceContext,
        input: DeleteAncillaryItem,
    ) -> Result<String, DeleteAncillaryItemError> {
        delete_ancillary_item(ctx, input)
    }

    fn set_supply_wastage_rate(
        &self,
        ctx: &ServiceContext,
        input: SetSupplyWastageRate,
    ) -> Result<f64, SetSupplyWastageRateError> {
        set_supply_wastage_rate(ctx, input)
    }
}

pub struct ItemService {}
impl ItemServiceTrait for ItemService {}
