use async_graphql::*;
use dataloader::DataLoader;
use graphql_core::{loader::PackagingVariantRowLoader, ContextExt};
use repository::item_variant::{
    item_variant_row::ItemVariantRow, packaging_variant_row::PackagingVariantRow,
};
use repository::name::Name;
use repository::NameRow;

use super::NameNode;
pub struct PackagingVariantNode {
    pub packaging_variant: PackagingVariantRow,
}

pub struct ItemVariantNode {
    pub item_variant: ItemVariantRow,
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

    pub async fn manufacturer_id(&self) -> &Option<String> {
        &self.item_variant.manufacturer_link_id // TODO join to name for manufacturer_id https://github.com/msupply-foundation/open-msupply/issues/5241
    }

    pub async fn cold_storage_type_id(&self) -> &Option<String> {
        &self.item_variant.cold_storage_type_id
    }

    // tODO full node for cold_storage_type / manufacturer?
    pub async fn manufacturer(&self) -> Option<NameNode> {
        self.item_variant.manufacturer_link_id.clone().map(|id| {
            NameNode::from_domain(Name {
                name_row: NameRow {
                    id,
                    name: "Some manufacturer".to_string(),
                    code: "MANUFACTURER".to_string(),
                    ..Default::default()
                },
                name_store_join_row: None,
                store_row: None,
                properties: None,
            })
        })
    }

    pub async fn packaging_variants(&self, ctx: &Context<'_>) -> Result<Vec<PackagingVariantNode>> {
        let loader = ctx.get_loader::<DataLoader<PackagingVariantRowLoader>>();
        let result = loader
            .load_one(self.item_variant.id.clone())
            .await?
            .unwrap_or_default();

        Ok(PackagingVariantNode::from_vec(result))
    }
}

impl ItemVariantNode {
    pub fn from_domain(item_variant: ItemVariantRow) -> ItemVariantNode {
        ItemVariantNode { item_variant }
    }

    pub fn from_vec(variants: Vec<ItemVariantRow>) -> Vec<ItemVariantNode> {
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
