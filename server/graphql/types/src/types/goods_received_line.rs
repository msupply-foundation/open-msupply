// use chrono::NaiveDate;
// use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError, ContextExt};
// use repository::{ItemRow, PurchaseOrderLine, PurchaseOrderLineRow};
// use service::{usize_to_u32, ListResult};
// use crate::types::ItemNode;

use async_graphql::{dataloader::DataLoader, *};
use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError, ContextExt};
use repository::{GoodsReceivedLineRow, ItemRow};

use crate::types::ItemNode;

#[derive(PartialEq, Debug)]
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
    // pub async fn id(&self) -> &str {
    //     &self.row().id
    // }
    // pub async fn purchase_order_id(&self) -> &str {
    //     &self.row().purchase_order_id
    // }
    // pub async fn line_number(&self) -> i64 {
    //     self.row().line_number
    // }
    // pub async fn price_per_unit_before_discount(&self) -> f64 {
    //     self.row().price_per_unit_before_discount
    // }
    // pub async fn price_per_unit_after_discount(&self) -> f64 {
    //     self.row().price_per_unit_after_discount
    // }
    // pub async fn comment(&self) -> &Option<String> {
    //     &self.row().comment
    // }
    // pub async fn supplier_item_code(&self) -> &Option<String> {
    //     &self.row().supplier_item_code
    // }
    // pub async fn stock_on_hand_in_units(&self) -> f64 {
    //     self.row().stock_on_hand_in_units
    // }
    // pub async fn requested_pack_size(&self) -> f64 {
    //     self.row().requested_pack_size
    // }
    // pub async fn requested_number_of_units(&self) -> f64 {
    //     self.row().requested_number_of_units
    // }
    // pub async fn authorised_number_of_units(&self) -> &Option<f64> {
    //     &self.row().authorised_number_of_units
    // }
    // pub async fn received_number_of_units(&self) -> f64 {
    //     self.row().received_number_of_units
    // }
    // pub async fn requested_delivery_date(&self) -> &Option<NaiveDate> {
    //     &self.row().requested_delivery_date
    // }
    // pub async fn expected_delivery_date(&self) -> &Option<NaiveDate> {
    //     &self.row().expected_delivery_date
    // }
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

// impl GoodsReceivedLineNode {
//     pub fn from_domain(goods_received_line: GoodsReceivedLine) -> GoodsReceivedLineNode {
//         GoodsReceivedLineNode {
//             goods_received_line: goods_received_line.goods_received_line_row,
//             item: goods_received_line.item_row,
//         }
//     }
// }

// impl GoodsReceivedLineConnector {
//     pub fn from_vec(purchase_order_lines: Vec<GoodsReceivedLine>) -> GoodsReceivedLineConnector {
//         GoodsReceivedLineConnector {
//             total_count: usize_to_u32(purchase_order_lines.len()),
//             nodes: purchase_order_lines
//                 .into_iter()
//                 .map(GoodsReceivedLineNode::from_domain)
//                 .collect(),
//         }
//     }
// }

impl GoodsReceivedLineNode {
    pub fn row(&self) -> &GoodsReceivedLineRow {
        &self.goods_received_line
    }
}

// impl GoodsReceivedLineConnector {
//     pub fn from_domain(
//         goods_receipts: ListResult<GoodsReceivedLine>,
//     ) -> GoodsReceivedLineConnector {
//         GoodsReceivedLineConnector {
//             total_count: goods_receipts.count,
//             nodes: goods_receipts
//                 .rows
//                 .into_iter()
//                 .map(GoodsReceivedLineNode::from_domain)
//                 .collect(),
//         }
//     }
// }
