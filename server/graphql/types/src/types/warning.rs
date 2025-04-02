use async_graphql::*;

use repository::{ItemRow, ItemWarningLink, WarningRow};

pub struct WarningNode {
    pub warning: ItemWarningLink,
}

#[Object]
impl WarningNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn item_link_id(&self) -> &str {
        &self.item_row().id
    }
    pub async fn warning_id(&self) -> &str {
        &self.row().id
    }
    pub async fn priority(&self) -> &bool {
        &self.warning.item_warning_link_row.priority
    }
    pub async fn warning_text(&self) -> &str {
        &self.row().warning_text
    }
}

impl WarningNode {
    pub fn from_domain(warning: ItemWarningLink) -> WarningNode {
        WarningNode { warning }
    }

    pub fn from_vec(warnings: Vec<ItemWarningLink>) -> Vec<WarningNode> {
        warnings.into_iter().map(WarningNode::from_domain).collect()
    } // warnings

    pub fn row(&self) -> &WarningRow {
        &self.warning.warning_row
    }
    pub fn item_row(&self) -> &ItemRow {
        &self.warning.item_row
    }
    pub fn warn_row(&self) -> &bool {
        &self.warning.item_warning_link_row.priority
    }
}
