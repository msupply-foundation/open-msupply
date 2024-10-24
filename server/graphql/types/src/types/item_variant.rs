use async_graphql::*;
use repository::item_variant::{
    item_variant_row::ItemVariantRow, packaging_variant_row::PackagingVariantRow,
};
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

    pub async fn item_id(&self) -> &String {
        &self.item_variant.item_link_id // TODO join to item for item_id
    }

    pub async fn name(&self) -> &String {
        &self.item_variant.name
    }

    pub async fn doses_per_unit(&self) -> &Option<f64> {
        &self.item_variant.doses_per_unit
    }

    pub async fn manufacturer_id(&self) -> &Option<String> {
        &self.item_variant.manufacturer_link_id // TODO join to name for manufacturer_id
    }

    pub async fn cold_storage_type_id(&self) -> &Option<String> {
        &self.item_variant.cold_storage_type_id
    }

    // tODO full node for cold_storage_type / manufacturer?

    pub async fn packaging_variants(&self) -> Vec<PackagingVariantNode> {
        PackagingVariantNode::from_vec(vec![
            PackagingVariantRow {
                id: "1".to_string(),
                item_variant_id: self.item_variant.id.clone(),
                name: "Primary".to_string(),
                packaging_level: 1,
                pack_size: Some(1.0),
                volume_per_unit: Some(1.0),
                deleted_datetime: None,
            },
            PackagingVariantRow {
                id: "2".to_string(),
                item_variant_id: self.item_variant.id.clone(),
                name: "Secondary".to_string(),
                packaging_level: 2,
                pack_size: Some(2.0),
                volume_per_unit: Some(2.0),
                deleted_datetime: None,
            },
            PackagingVariantRow {
                id: "3".to_string(),
                item_variant_id: self.item_variant.id.clone(),
                name: "Tertiary".to_string(),
                packaging_level: 3,
                pack_size: Some(3.0),
                volume_per_unit: Some(3.0),
                deleted_datetime: None,
            },
        ])
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
