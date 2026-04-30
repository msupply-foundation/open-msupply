use crate::types::LocationTypeNode;

use super::{BundledItemNode, ItemNode, NameNode};
use async_graphql::*;
use dataloader::DataLoader;
use graphql_core::loader::{
    BundledItemByBundledItemVariantIdLoader, BundledItemByPrincipalItemVariantIdLoader, ItemLoader,
    LocationTypeLoader, NameByIdLoader, NameByIdLoaderInput,
};
use graphql_core::{loader::PackagingVariantRowLoader, ContextExt};
use repository::item_variant::item_variant::ItemVariant;
use repository::item_variant::{
    item_variant_row::ItemVariantRow, packaging_variant_row::PackagingVariantRow,
};
use repository::ItemRow;
pub struct PackagingVariantNode {
    pub packaging_variant: PackagingVariantRow,
}

pub struct ItemVariantNode {
    pub item_variant: ItemVariantRow,
    pub item: ItemRow,
}

#[Object]
impl ItemVariantNode {
    pub async fn id(&self) -> &String {
        &self.item_variant.id
    }

    pub async fn name(&self) -> &String {
        &self.item_variant.name
    }

    pub async fn item_id(&self) -> &String {
        &self.item.id
    }
    pub async fn item_name(&self) -> &String {
        &self.item.name
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<Option<ItemNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let result = loader.load_one(self.item.id.clone()).await?;

        Ok(result.map(ItemNode::from_domain))
    }

    pub async fn manufacturer_id(&self) -> &Option<String> {
        &self.item_variant.manufacturer_id // TODO join to name for manufacturer_id https://github.com/msupply-foundation/open-msupply/issues/5241
    }

    pub async fn location_type_id(&self) -> &Option<String> {
        &self.item_variant.location_type_id
    }

    pub async fn location_type(&self, ctx: &Context<'_>) -> Result<Option<LocationTypeNode>> {
        let location_type_id = match &self.item_variant.location_type_id {
            Some(location_type_id) => location_type_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<LocationTypeLoader>>();
        Ok(loader
            .load_one(location_type_id.clone())
            .await?
            .map(LocationTypeNode::from_domain))
    }

    pub async fn manufacturer(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Option<NameNode>> {
        let manufacturer_link_id = match &self.item_variant.manufacturer_id {
            Some(manufacturer_link_id) => manufacturer_link_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        let result = loader
            .load_one(NameByIdLoaderInput::new(&store_id, manufacturer_link_id))
            .await?;

        Ok(result.map(NameNode::from_domain))
    }

    pub async fn packaging_variants(&self, ctx: &Context<'_>) -> Result<Vec<PackagingVariantNode>> {
        let loader = ctx.get_loader::<DataLoader<PackagingVariantRowLoader>>();
        let result = loader
            .load_one(self.item_variant.id.clone())
            .await?
            .unwrap_or_default();

        Ok(PackagingVariantNode::from_vec(result))
    }

    /// This item variant is the principal item variant in a bundle - these items are bundled with it
    pub async fn bundled_item_variants(&self, ctx: &Context<'_>) -> Result<Vec<BundledItemNode>> {
        let loader = ctx.get_loader::<DataLoader<BundledItemByPrincipalItemVariantIdLoader>>();
        let result = loader
            .load_one(self.item_variant.id.clone())
            .await?
            .unwrap_or_default();

        Ok(BundledItemNode::from_vec(result))
    }

    /// This item variant is bundled with other (principal) item variants
    pub async fn bundles_with(&self, ctx: &Context<'_>) -> Result<Vec<BundledItemNode>> {
        let loader = ctx.get_loader::<DataLoader<BundledItemByBundledItemVariantIdLoader>>();
        let result = loader
            .load_one(self.item_variant.id.clone())
            .await?
            .unwrap_or_default();

        Ok(BundledItemNode::from_vec(result))
    }

    pub async fn vvm_type(&self) -> &Option<String> {
        &self.item_variant.vvm_type
    }
}

impl ItemVariantNode {
    pub fn from_domain(
        ItemVariant {
            item_variant_row,
            item_row,
            manufacturer_row: _,
            location_type_row: _,
        }: ItemVariant,
    ) -> ItemVariantNode {
        ItemVariantNode {
            item_variant: item_variant_row,
            item: item_row,
        }
    }

    pub fn from_vec(variants: Vec<ItemVariant>) -> Vec<ItemVariantNode> {
        variants
            .into_iter()
            .map(ItemVariantNode::from_domain)
            .collect()
    }
}

#[Object]
impl PackagingVariantNode {
    pub async fn id(&self) -> &str {
        &self.packaging_variant.id
    }

    pub async fn name(&self) -> &str {
        &self.packaging_variant.name
    }

    pub async fn packaging_level(&self) -> &i32 {
        &self.packaging_variant.packaging_level
    }

    pub async fn pack_size(&self) -> Option<f64> {
        self.packaging_variant.pack_size
    }

    pub async fn volume_per_unit(&self) -> Option<f64> {
        self.packaging_variant.volume_per_unit
    }
}

impl PackagingVariantNode {
    pub fn from_domain(packaging_variant: PackagingVariantRow) -> PackagingVariantNode {
        PackagingVariantNode { packaging_variant }
    }

    pub fn from_vec(variants: Vec<PackagingVariantRow>) -> Vec<PackagingVariantNode> {
        variants
            .into_iter()
            .map(PackagingVariantNode::from_domain)
            .collect()
    }
}
