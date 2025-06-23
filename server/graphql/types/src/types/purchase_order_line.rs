use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError, ContextExt};
use repository::{ItemRow, PurchaseOrderLine, PurchaseOrderLineRow};
use service::{usize_to_u32, ListResult};

use crate::types::ItemNode;

#[derive(PartialEq, Debug)]
pub struct PurchaseOrderLineNode {
    pub purchase_order_line: PurchaseOrderLineRow,
    pub item: ItemRow,
}

#[derive(SimpleObject)]
pub struct PurchaseOrderLineConnector {
    pub total_count: u32,
    pub nodes: Vec<PurchaseOrderLineNode>,
}

#[Object]
impl PurchaseOrderLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn purchase_order_id(&self) -> &str {
        &self.row().purchase_order_id
    }
    pub async fn line_number(&self) -> &Option<i64> {
        &self.row().line_number
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();

        let result = loader.load_one(self.item.id.to_string()).await?;

        result.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item ({}) linked to purchase_order_line ({})",
                &self.item.id,
                &self.row().id
            ))
            .extend(),
        )
    }
    pub async fn item_name(&self) -> &Option<String> {
        &self.row().item_name
    }
    pub async fn number_of_packs(&self) -> &Option<f64> {
        &self.row().number_of_packs
    }
    pub async fn pack_size(&self) -> &Option<f64> {
        &self.row().pack_size
    }
    pub async fn requested_quantity(&self) -> &Option<f64> {
        &self.row().requested_quantity
    }
    pub async fn authorised_quantity(&self) -> &Option<f64> {
        &self.row().authorised_quantity
    }
    pub async fn total_received(&self) -> &Option<f64> {
        &self.row().total_received
    }
    pub async fn requested_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().requested_delivery_date
    }
    pub async fn expected_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().expected_delivery_date
    }
}

impl PurchaseOrderLineNode {
    pub fn from_domain(purchase_order_line: PurchaseOrderLine) -> PurchaseOrderLineNode {
        PurchaseOrderLineNode {
            purchase_order_line: purchase_order_line.purchase_order_line_row,
            item: purchase_order_line.item_row,
        }
    }
}

impl PurchaseOrderLineConnector {
    pub fn from_vec(purchase_order_lines: Vec<PurchaseOrderLine>) -> PurchaseOrderLineConnector {
        PurchaseOrderLineConnector {
            total_count: usize_to_u32(purchase_order_lines.len()),
            nodes: purchase_order_lines
                .into_iter()
                .map(PurchaseOrderLineNode::from_domain)
                .collect(),
        }
    }
}

impl PurchaseOrderLineNode {
    pub fn row(&self) -> &PurchaseOrderLineRow {
        &self.purchase_order_line
    }
}

impl PurchaseOrderLineConnector {
    pub fn from_domain(
        purchase_orders: ListResult<PurchaseOrderLine>,
    ) -> PurchaseOrderLineConnector {
        PurchaseOrderLineConnector {
            total_count: purchase_orders.count,
            nodes: purchase_orders
                .rows
                .into_iter()
                .map(PurchaseOrderLineNode::from_domain)
                .collect(),
        }
    }
}
