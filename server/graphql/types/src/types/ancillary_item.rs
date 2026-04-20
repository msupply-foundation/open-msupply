use async_graphql::{dataloader::DataLoader, *};
use graphql_core::{loader::ItemLoader, ContextExt};
use repository::ancillary_item_row::AncillaryItemRow;

use super::ItemNode;

pub struct AncillaryItemNode {
    pub ancillary_item: AncillaryItemRow,
}

#[Object]
impl AncillaryItemNode {
    pub async fn id(&self) -> &str {
        &self.ancillary_item.id
    }

    /// Left-hand side of the stored `x:y` ratio (principal count).
    pub async fn item_quantity(&self) -> f64 {
        self.ancillary_item.item_quantity
    }

    /// Right-hand side of the stored `x:y` ratio (ancillary count).
    pub async fn ancillary_quantity(&self) -> f64 {
        self.ancillary_item.ancillary_quantity
    }

    pub async fn item_link_id(&self) -> &str {
        &self.ancillary_item.item_link_id
    }

    pub async fn ancillary_item_link_id(&self) -> &str {
        &self.ancillary_item.ancillary_item_link_id
    }

    /// The principal item — the item this ancillary supply should be ordered alongside.
    /// Resolved via `item_link_id`, which matches `item.id` in the common (unmerged) case.
    pub async fn item(&self, ctx: &Context<'_>) -> Result<Option<ItemNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let result = loader
            .load_one(self.ancillary_item.item_link_id.clone())
            .await?;
        Ok(result.map(ItemNode::from_domain))
    }

    /// The ancillary item — the item to be added to the order as a supply for the principal.
    pub async fn ancillary_item(&self, ctx: &Context<'_>) -> Result<Option<ItemNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let result = loader
            .load_one(self.ancillary_item.ancillary_item_link_id.clone())
            .await?;
        Ok(result.map(ItemNode::from_domain))
    }
}

impl AncillaryItemNode {
    pub fn from_domain(ancillary_item: AncillaryItemRow) -> AncillaryItemNode {
        AncillaryItemNode { ancillary_item }
    }

    pub fn from_vec(rows: Vec<AncillaryItemRow>) -> Vec<AncillaryItemNode> {
        rows.into_iter().map(AncillaryItemNode::from_domain).collect()
    }
}
