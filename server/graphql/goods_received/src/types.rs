use async_graphql::*;
use graphql_core::ContextExt;
use repository::goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus};
// use repository::{GoodsReceivedRow, GoodsReceivedStatus};
use service::ListResult;

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
