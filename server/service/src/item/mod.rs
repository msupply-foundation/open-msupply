pub mod item;
pub use item::*;
use item_variant::{
    delete_item_variant, get_item_variants, insert_item_variant, update_item_variant,
    DeleteItemVariant, DeleteItemVariantError, InsertItemVariant, InsertItemVariantError,
    UpdateItemVariant, UpdateItemVariantError,
};
use repository::{
    item_variant::{
        item_variant::{ItemVariantFilter, ItemVariantSort},
        item_variant_row::ItemVariantRow,
    },
    PaginationOption,
};
pub mod item_variant;
pub mod packaging_variant;

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

    fn insert_item_variant(
        &self,
        ctx: &ServiceContext,
        input: InsertItemVariant,
    ) -> Result<ItemVariantRow, InsertItemVariantError> {
        insert_item_variant(ctx, input)
    }

    fn update_item_variant(
        &self,
        ctx: &ServiceContext,
        input: UpdateItemVariant,
    ) -> Result<ItemVariantRow, UpdateItemVariantError> {
        update_item_variant(ctx, input)
    }

    fn delete_item_variant(
        &self,
        ctx: &ServiceContext,
        input: DeleteItemVariant,
    ) -> Result<String, DeleteItemVariantError> {
        delete_item_variant(ctx, input)
    }
    /*
    fn get_packaging_variants(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Vec<ItemPackagingVariant>, RepositoryError> {
        get_packaging_variants(ctx)
    }

    fn insert_packaging_variant(
        &self,
        ctx: &ServiceContext,
        input: InsertPackagingVariant,
    ) -> Result<PackagingVariantRow, InsertPackagingVariantError> {
        insert_packaging_variant(ctx, input)
    }

    fn update_packaging_variant(
        &self,
        ctx: &ServiceContext,
        input: UpdatePackagingVariant,
    ) -> Result<PackVariantRow, UpdatePackVariantError> {
        update_packaging_variant(ctx, input)
    }

    fn delete_packaging_variant(
        &self,
        ctx: &ServiceContext,
        input: DeletePackagingVariant,
    ) -> Result<String, DeletePackagingVariantError> {
        delete_packaging_variant(ctx, input)
    }
     */
}

pub struct ItemService {}
impl ItemServiceTrait for ItemService {}
