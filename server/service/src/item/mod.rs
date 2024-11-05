pub mod bundled_item;
pub mod item;
pub mod item_variant;
pub mod packaging_variant;
use bundled_item::{
    delete_bundled_item, get_bundled_items, upsert_bundled_item, DeleteBundledItem,
    DeleteBundledItemError, UpsertBundledItem, UpsertBundledItemError,
};
pub use item::*;
use item_variant::{
    delete_item_variant, get_item_variants, upsert_item_variant, DeleteItemVariant,
    DeleteItemVariantError, UpsertItemVariantError, UpsertItemVariantWithPackaging,
};
use packaging_variant::{
    delete_packaging_variant, get_packaging_variants, upsert_packaging_variant,
    DeletePackagingVariant, DeletePackagingVariantError, UpsertPackagingVariant,
    UpsertPackagingVariantError,
};
use repository::{
    item_variant::{
        bundled_item::BundledItemFilter,
        bundled_item_row::BundledItemRow,
        item_variant::{ItemVariantFilter, ItemVariantSort},
        item_variant_row::ItemVariantRow,
        packaging_variant::{PackagingVariantFilter, PackagingVariantSort},
        packaging_variant_row::PackagingVariantRow,
    },
    PaginationOption,
};

use crate::{service_provider::ServiceContext, ListError, ListResult};

pub trait ItemServiceTrait: Sync + Send {
    fn get_item_variants(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<ItemVariantFilter>,
        sort: Option<ItemVariantSort>,
    ) -> Result<ListResult<ItemVariantRow>, ListError> {
        get_item_variants(&ctx.connection, pagination, filter, sort)
    }

    fn upsert_item_variant(
        &self,
        ctx: &ServiceContext,
        input: UpsertItemVariantWithPackaging,
    ) -> Result<ItemVariantRow, UpsertItemVariantError> {
        upsert_item_variant(ctx, input)
    }

    fn delete_item_variant(
        &self,
        ctx: &ServiceContext,
        input: DeleteItemVariant,
    ) -> Result<String, DeleteItemVariantError> {
        delete_item_variant(ctx, input)
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
}

pub struct ItemService {}
impl ItemServiceTrait for ItemService {}
