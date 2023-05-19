use async_graphql::*;
use chrono::NaiveDateTime;
use service::repack::query::Repack;

use super::{LocationNode, StockLineNode};

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
    // Repacked number of packs before conversion (for from stock line)
    pub number_of_packs: f64,
    pub pack_size: i32,
    pub location: Option<LocationNode>,
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
    async fn number_of_packs(&self) -> f64 {
        self.number_of_packs
    }

    async fn pack_size(&self) -> i32 {
        self.pack_size
    }

    async fn location(&self) -> &Option<LocationNode> {
        &self.location
    }

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
                number_of_packs: repack.stock_to.stock_line_row.total_number_of_packs
                    * repack.stock_to.stock_line_row.pack_size as f64
                    / repack.stock_from.stock_line_row.pack_size as f64,
                pack_size: repack.stock_from.stock_line_row.pack_size,
                location: repack.location_from.map(LocationNode::from_domain),
                stock_line: StockLineNode::from_domain(repack.stock_from.clone()),
            },
            to: RepackStockLineNode {
                number_of_packs: repack.stock_to.stock_line_row.total_number_of_packs,
                pack_size: repack.stock_to.stock_line_row.pack_size,
                location: repack.location_to.map(LocationNode::from_domain),
                stock_line: StockLineNode::from_domain(repack.stock_to),
            },
        }
    }
}
