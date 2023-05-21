use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDateTime;
use graphql_core::{loader::LocationByIdLoader, ContextExt};
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
    pub location_id: Option<String>,
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

    async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        let location_id = match &self.location_id {
            None => return Ok(None),
            Some(location_id) => location_id,
        };

        let result = loader.load_one(location_id.clone()).await?;

        Ok(result.map(LocationNode::from_domain))
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
                number_of_packs: repack.invoice_line_to.invoice_line_row.number_of_packs
                    * repack.invoice_line_to.invoice_line_row.pack_size as f64
                    / repack.invoice_line_from.invoice_line_row.pack_size as f64,
                pack_size: repack.invoice_line_from.invoice_line_row.pack_size,
                location_id: repack
                    .invoice_line_from
                    .location_row_option
                    .as_ref()
                    .map(|l| l.id.clone()),
                stock_line: StockLineNode::from_domain(repack.stock_from.clone()),
            },
            to: RepackStockLineNode {
                number_of_packs: repack.invoice_line_to.invoice_line_row.number_of_packs,
                pack_size: repack.invoice_line_to.invoice_line_row.pack_size,
                location_id: repack
                    .invoice_line_to
                    .location_row_option
                    .as_ref()
                    .map(|l| l.id.clone()),
                stock_line: StockLineNode::from_domain(repack.stock_to),
            },
        }
    }
}
