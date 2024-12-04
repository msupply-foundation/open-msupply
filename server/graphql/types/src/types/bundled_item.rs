use async_graphql::*;
use dataloader::DataLoader;
use graphql_core::{loader::ItemVariantByItemVariantIdLoader, ContextExt};
use repository::item_variant::bundled_item_row::BundledItemRow;

use super::ItemVariantNode;

pub struct BundledItemNode {
    pub bundled_item: BundledItemRow,
}

#[Object]
impl BundledItemNode {
    pub async fn id(&self) -> &String {
        &self.bundled_item.id
    }

    pub async fn ratio(&self) -> &f64 {
        &self.bundled_item.ratio
    }

    pub async fn principal_item_variant_id(&self) -> &String {
        &self.bundled_item.principal_item_variant_id
    }

    pub async fn principal_item_variant(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<ItemVariantNode>> {
        let principal_item_variant_id = &self.bundled_item.principal_item_variant_id;
        let loader = ctx.get_loader::<DataLoader<ItemVariantByItemVariantIdLoader>>();
        let result = loader.load_one(principal_item_variant_id.clone()).await?;
        Ok(result.map(|item_variant| ItemVariantNode::from_domain(item_variant)))
    }

    pub async fn bundled_item_variant_id(&self) -> &String {
        &self.bundled_item.bundled_item_variant_id
    }

    pub async fn bundled_item_variant(&self, ctx: &Context<'_>) -> Result<Option<ItemVariantNode>> {
        let bundled_item_variant_id = &self.bundled_item.bundled_item_variant_id;
        let loader = ctx.get_loader::<DataLoader<ItemVariantByItemVariantIdLoader>>();
        let result = loader.load_one(bundled_item_variant_id.clone()).await?;
        Ok(result.map(|item_variant| ItemVariantNode::from_domain(item_variant)))
    }
}

impl BundledItemNode {
    pub fn from_domain(bundled_item: BundledItemRow) -> BundledItemNode {
        BundledItemNode { bundled_item }
    }

    pub fn from_vec(variants: Vec<BundledItemRow>) -> Vec<BundledItemNode> {
        variants
            .into_iter()
            .map(BundledItemNode::from_domain)
            .collect()
    }
}
