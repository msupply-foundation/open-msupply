use super::{BundledItemNode, ColdStorageTypeNode, NameNode};
use async_graphql::*;
use dataloader::DataLoader;
use graphql_core::loader::{
    BundledItemByBundledItemVariantIdLoader, BundledItemByPrincipalItemVariantIdLoader,
    ColdStorageTypeLoader, NameByIdLoader, NameByIdLoaderInput,
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

    pub async fn doses_per_unit(&self) -> &Option<i32> {
        &self.item_variant.doses_per_unit
    }

    pub async fn item_id(&self) -> &String {
        &self.item.id
    }

    pub async fn item_name(&self) -> &String {
        &self.item.name
    }

    pub async fn manufacturer_id(&self) -> &Option<String> {
        &self.item_variant.manufacturer_link_id // TODO join to name for manufacturer_id https://github.com/msupply-foundation/open-msupply/issues/5241
    }

    pub async fn cold_storage_type_id(&self) -> &Option<String> {
        &self.item_variant.cold_storage_type_id
    }

    pub async fn cold_storage_type(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<ColdStorageTypeNode>> {
        let cold_storage_type_id = match &self.item_variant.cold_storage_type_id {
            Some(cold_storage_type_id) => cold_storage_type_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<ColdStorageTypeLoader>>();
        let result = loader.load_one(cold_storage_type_id.clone()).await?;

        Ok(result.map(|cold_storage_type| ColdStorageTypeNode::from_domain(cold_storage_type)))
    }

    pub async fn manufacturer(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Option<NameNode>> {
        let manufacturer_link_id = match &self.item_variant.manufacturer_link_id {
            Some(manufacturer_link_id) => manufacturer_link_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        let result = loader
            .load_one(NameByIdLoaderInput::new(&store_id, manufacturer_link_id))
            .await?;

        Ok(result.map(|manufacturer| NameNode::from_domain(manufacturer)))
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
}

impl ItemVariantNode {
    pub fn from_domain(
        ItemVariant {
            item_variant_row,
            item_row,
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
