use async_graphql::*;
use chrono::NaiveDateTime;
use service::repack::query::Repack;

use super::StockLineNode;

pub struct RepackNode {
    // Invoice id
    pub id: String,
    pub repack_id: String,
    pub batch: Option<String>,
    pub datetime: NaiveDateTime,
    pub from: RepackStockLineNode,
    pub to: RepackStockLineNode,
}

pub struct RepackStockLineNode {
    pub stock_line: StockLineNode,
}

#[Object]
impl RepackNode {
    async fn id(&self) -> &str {
        &self.id
    }

    async fn repack_id(&self) -> &str {
        &self.repack_id
    }

    async fn batch(&self) -> &Option<String> {
        &self.batch
    }

    async fn datetime(&self) -> NaiveDateTime {
        self.datetime
    }

    async fn from(&self) -> &RepackStockLineNode {
        &self.from
    }

    async fn to(&self) -> &RepackStockLineNode {
        &self.to
    }
}

#[Object]
impl RepackStockLineNode {
    async fn stock_line(&self) -> &StockLineNode {
        &self.stock_line
    }
}

impl RepackNode {
    pub fn from_domain(repack: Repack) -> RepackNode {
        RepackNode {
            id: repack.invoice.invoice_row.id,
            repack_id: repack.stock_to.stock_line_row.id.clone(),
            batch: repack.stock_to.stock_line_row.batch.clone(),
            datetime: repack
                .invoice
                .invoice_row
                .verified_datetime
                .unwrap_or(repack.invoice.invoice_row.created_datetime),
            from: RepackStockLineNode {
                stock_line: StockLineNode::from_domain(repack.stock_from),
            },
            to: RepackStockLineNode {
                stock_line: StockLineNode::from_domain(repack.stock_to),
            },
        }
    }
}
