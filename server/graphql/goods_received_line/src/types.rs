use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::loader::{ItemLoader, LocationByIdLoader};
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use service::{usize_to_u32, ListResult};

use repository::{GoodsReceivedLine, GoodsReceivedLineRow, ItemRow};

use graphql_types::types::{ItemNode, LocationNode};
pub struct GoodsReceivedLineNode {
    pub goods_received_line: GoodsReceivedLineRow,
    pub item: ItemRow,
}

#[derive(SimpleObject)]
pub struct GoodsReceivedLineConnector {
    pub total_count: u32,
    pub nodes: Vec<GoodsReceivedLineNode>,
}

#[Object]
impl GoodsReceivedLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn goods_received_id(&self) -> &str {
        &self.row().goods_received_id
    }
    pub async fn purchase_order_line_id(&self) -> &str {
        &self.row().purchase_order_line_id
    }
    pub async fn received_pack_size(&self) -> f64 {
        self.row().received_pack_size
    }
    pub async fn number_of_packs_received(&self) -> f64 {
        self.row().number_of_packs_received
    }
    pub async fn batch(&self) -> &Option<String> {
        &self.row().batch
    }
    pub async fn weight_per_pack(&self) -> &Option<f64> {
        &self.row().weight_per_pack
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.row().expiry_date
    }
    pub async fn line_number(&self) -> i64 {
        self.row().line_number
    }
    pub async fn item_link_id(&self) -> &str {
        &self.row().item_link_id
    }
    pub async fn item_name(&self) -> &str {
        &self.row().item_name
    }
    pub async fn location_id(&self) -> &Option<String> {
        &self.row().location_id
    }
    pub async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let location_id = match &self.row().location_id {
            Some(location_id) => location_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        Ok(loader
            .load_one(location_id.clone())
            .await?
            .map(LocationNode::from_domain))
    }

    pub async fn volume_per_pack(&self) -> &Option<f64> {
        &self.row().volume_per_pack
    }
    pub async fn manufacturer_link_id(&self) -> &Option<String> {
        &self.row().manufacturer_id
    }
    pub async fn status(&self) -> GoodsReceivedLineNodeStatus {
        GoodsReceivedLineNodeStatus::from(self.row().status.clone())
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();

        let result = loader.load_one(self.item.id.to_string()).await?;

        result.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item ({}) linked to goods_received_line ({})",
                &self.item.id,
                &self.row().id
            ))
            .extend(),
        )
    }
}

impl GoodsReceivedLineNode {
    pub fn from_domain(goods_received_line: GoodsReceivedLine) -> GoodsReceivedLineNode {
        GoodsReceivedLineNode {
            goods_received_line: goods_received_line.goods_received_line_row,
            item: goods_received_line.item_row,
        }
    }
}

impl GoodsReceivedLineConnector {
    pub fn from_vec(goods_received_lines: Vec<GoodsReceivedLine>) -> GoodsReceivedLineConnector {
        GoodsReceivedLineConnector {
            total_count: usize_to_u32(goods_received_lines.len()),
            nodes: goods_received_lines
                .into_iter()
                .map(GoodsReceivedLineNode::from_domain)
                .collect(),
        }
    }
}

impl GoodsReceivedLineNode {
    pub fn row(&self) -> &GoodsReceivedLineRow {
        &self.goods_received_line
    }
}

impl GoodsReceivedLineConnector {
    pub fn from_domain(
        goods_receipts: ListResult<GoodsReceivedLine>,
    ) -> GoodsReceivedLineConnector {
        GoodsReceivedLineConnector {
            total_count: goods_receipts.count,
            nodes: goods_receipts
                .rows
                .into_iter()
                .map(GoodsReceivedLineNode::from_domain)
                .collect(),
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::goods_received_line_row
::GoodsReceivedLineStatus")]
pub enum GoodsReceivedLineNodeStatus {
    Authorised,
    Unauthorised,
}
