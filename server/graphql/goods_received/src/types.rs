use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use graphql_core::loader::{NameByIdLoader, NameByIdLoaderInput, PurchaseOrderByIdLoader};
use graphql_core::ContextExt;
use graphql_types::types::{purchase_order, NameNode};
use repository::goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus};
use service::ListResult;

use repository::{GoodsReceivedLineRow, ItemRow};

use graphql_types::types::ItemNode;
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
    pub async fn volume_per_pack(&self) -> &Option<f64> {
        &self.row().volume_per_pack
    }
    pub async fn manufacturer_link_id(&self) -> &Option<String> {
        &self.row().manufacturer_link_id
    }
    pub async fn status(&self) -> GoodsReceivedLineNodeStatus {
        GoodsReceivedLineNodeStatus::from_domain(self.row().status.clone())
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
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
    pub fn from_vec(purchase_order_lines: Vec<GoodsReceivedLine>) -> GoodsReceivedLineConnector {
        GoodsReceivedLineConnector {
            total_count: usize_to_u32(purchase_order_lines.len()),
            nodes: purchase_order_lines
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
pub enum GoodsReceivedLineNodeStatus {
    Authorised,
    Unauthorised,
}

impl GoodsReceivedLineNodeStatus {
    pub fn from_domain(status: GoodsReceivedLineStatus) -> GoodsReceivedLineNodeStatus {
        use GoodsReceivedLineStatus::*;
        match status {
            Authorised => GoodsReceivedLineNodeStatus::Authorised,
            Unauthorised => GoodsReceivedLineNodeStatus::Unauthorised,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct GoodsReceivedNode {
    pub goods_received: GoodsReceivedRow,
}

#[derive(SimpleObject)]
pub struct GoodsReceivedConnector {
    pub total_count: u32,
    pub nodes: Vec<GoodsReceivedNode>,
}

#[Object]
impl GoodsReceivedNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn number(&self) -> &i64 {
        &self.row().goods_received_number
    }

    pub async fn status(&self) -> GoodsReceivedNodeStatus {
        GoodsReceivedNodeStatus::from_domain(self.row().status.clone())
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn supplier(&self, ctx: &Context<'_>) -> Result<Option<NameNode>> {
        let po_id = match self.row().purchase_order_id {
            Some(ref id) => id,
            None => return Ok(None),
        };

        let po_loader = ctx.get_loader::<DataLoader<PurchaseOrderByIdLoader>>();
        let purchase_order = po_loader
            .load_one(po_id.clone())
            .await?
            .map(purchase_order::PurchaseOrderNode::from_domain);

        if let Some(po) = purchase_order {
            let name_loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
            let name = name_loader
                .load_one(NameByIdLoaderInput::new(
                    &po.row().store_id,
                    &po.row().supplier_name_link_id,
                ))
                .await?
                .map(NameNode::from_domain);
            return Ok(name);
        }
        return Ok(None);
    }

    pub async fn purchase_order_number(&self, ctx: &Context<'_>) -> Result<Option<i64>> {
        let po_id = match self.row().purchase_order_id {
            Some(ref id) => id,
            None => return Ok(None),
        };

        let po_loader = ctx.get_loader::<DataLoader<PurchaseOrderByIdLoader>>();
        let purchase_order = po_loader
            .load_one(po_id.clone())
            .await?
            .map(purchase_order::PurchaseOrderNode::from_domain);

        match purchase_order {
            Some(po) => Ok(Some(po.row().purchase_order_number)),
            None => Ok(None),
        }
    }

    pub async fn supplier_reference(&self) -> &Option<String> {
        &self.row().supplier_reference
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }

    pub async fn received_datetime(&self) -> Option<NaiveDate> {
        self.row().received_date
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<GoodsReceivedLineConnector> {
        let loader = ctx.get_loader::<DataLoader<GoodsReceivedLinesByGoodsReceivedIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);
        Ok(GoodsReceivedLineConnector::from_vec(result))
    }

    pub async fn created_by(&self) -> &Option<String> {
        &self.row().created_by
    }
}

impl GoodsReceivedNode {
    pub fn from_domain(goods_received: GoodsReceivedRow) -> GoodsReceivedNode {
        GoodsReceivedNode { goods_received }
    }
}

impl GoodsReceivedNode {
    pub fn row(&self) -> &GoodsReceivedRow {
        &self.goods_received
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum GoodsReceivedNodeStatus {
    New,
    Confirmed,
    Authorised,
    Finalised,
}

impl GoodsReceivedNodeStatus {
    pub fn from_domain(status: GoodsReceivedStatus) -> GoodsReceivedNodeStatus {
        use GoodsReceivedStatus::*;
        match status {
            New => GoodsReceivedNodeStatus::New,
            Finalised => GoodsReceivedNodeStatus::Finalised,
        }
    }

    // pub fn to_domain(self) -> GoodsReceivedStatus {
    //     use GoodsReceivedNodeStatus::*;
    //     match self {
    //         New => GoodsReceivedStatus::New,
    //         Confirmed => GoodsReceivedStatus::Confirmed,
    //         Authorised => GoodsReceivedStatus::Authorised,
    //         Finalised => GoodsReceivedStatus::Finalised,
    //     }
    // }
}

impl GoodsReceivedConnector {
    pub fn from_domain(goods_received: ListResult<GoodsReceivedRow>) -> GoodsReceivedConnector {
        GoodsReceivedConnector {
            total_count: goods_received.count,
            nodes: goods_received
                .rows
                .into_iter()
                .map(GoodsReceivedNode::from_domain)
                .collect(),
        }
    }
}