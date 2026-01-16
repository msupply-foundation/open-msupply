use crate::types::{ItemNode, NameNode, PurchaseOrderNode};
use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDate;
use graphql_core::{
    loader::{
        ItemLoader, NameByIdLoader, NameByIdLoaderInput, PurchaseOrderByIdLoader,
        UnitsInOtherPurchaseOrdersLoader,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{PurchaseOrderLine, PurchaseOrderLineRow};
use service::{usize_to_u32, ListResult};

#[derive(PartialEq, Debug)]
pub struct PurchaseOrderLineNode {
    pub purchase_order_line: PurchaseOrderLine,
}

#[derive(SimpleObject)]
pub struct PurchaseOrderLineConnector {
    pub total_count: u32,
    pub nodes: Vec<PurchaseOrderLineNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::purchase_order_line_row::PurchaseOrderLineStatus")]
pub enum PurchaseOrderLineStatusNode {
    New,
    Sent,
    Closed,
}

#[Object]
impl PurchaseOrderLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn purchase_order_id(&self) -> &str {
        &self.row().purchase_order_id
    }
    pub async fn line_number(&self) -> i64 {
        self.row().line_number
    }
    pub async fn price_per_pack_before_discount(&self) -> f64 {
        self.row().price_per_pack_before_discount
    }
    pub async fn price_per_pack_after_discount(&self) -> f64 {
        self.row().price_per_pack_after_discount
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }
    pub async fn supplier_item_code(&self) -> &Option<String> {
        &self.row().supplier_item_code
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();

        let result = loader
            .load_one(self.purchase_order_line.item_row.id.to_string())
            .await?;

        result.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item ({}) linked to purchase_order_line ({})",
                &self.purchase_order_line.item_row.id,
                &self.row().id
            ))
            .extend(),
        )
    }

    pub async fn stock_on_hand_in_units(&self) -> f64 {
        self.row().stock_on_hand_in_units
    }
    pub async fn requested_pack_size(&self) -> f64 {
        self.row().requested_pack_size
    }
    pub async fn requested_number_of_units(&self) -> f64 {
        self.row().requested_number_of_units
    }
    pub async fn adjusted_number_of_units(&self) -> &Option<f64> {
        &self.row().adjusted_number_of_units
    }
    pub async fn received_number_of_units(&self) -> f64 {
        self.row().received_number_of_units
    }
    pub async fn requested_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().requested_delivery_date
    }
    pub async fn expected_delivery_date(&self) -> &Option<NaiveDate> {
        &self.row().expected_delivery_date
    }

    pub async fn manufacturer(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<Option<NameNode>> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let Some(manufacturer_id) = &self.row().manufacturer_id else {
            return Ok(None);
        };

        let result = loader
            .load_one(NameByIdLoaderInput::new(&store_id, manufacturer_id))
            .await?;

        Ok(result.map(NameNode::from_domain))
    }

    pub async fn note(&self) -> &Option<String> {
        &self.row().note
    }

    pub async fn unit(&self) -> &Option<String> {
        &self.row().unit
    }

    pub async fn status(&self) -> PurchaseOrderLineStatusNode {
        PurchaseOrderLineStatusNode::from(self.row().status.clone())
    }

    pub async fn purchase_order(&self, ctx: &Context<'_>) -> Result<Option<PurchaseOrderNode>> {
        let loader = ctx.get_loader::<DataLoader<PurchaseOrderByIdLoader>>();
        let purchase_order = loader
            .load_one(self.row().purchase_order_id.clone())
            .await?
            .map(PurchaseOrderNode::from_domain);

        Ok(purchase_order)
    }

    pub async fn units_ordered_in_others(&self, ctx: &Context<'_>) -> Result<f64> {
        let loader = ctx.get_loader::<DataLoader<UnitsInOtherPurchaseOrdersLoader>>();

        let result = loader.load_one(self.row().id.clone()).await?.ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find units in other confirmed purchase orders for purchase order line ({})",
                &self.row().id
            ))
            .extend(),
        )?;

        Ok(result)
    }
}

impl PurchaseOrderLineNode {
    pub fn from_domain(purchase_order_line: PurchaseOrderLine) -> PurchaseOrderLineNode {
        PurchaseOrderLineNode {
            purchase_order_line: purchase_order_line,
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
        &self.purchase_order_line.purchase_order_line_row
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
