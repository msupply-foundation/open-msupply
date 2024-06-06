use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{
    loader::{InvoiceByIdLoader, LocationByIdLoader, StockLineByIdLoader},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use service::repack::query::Repack;

use super::{InvoiceNode, LocationNode, StockLineNode};

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
    pub pack_size: f64,
    pub location_id: Option<String>,
    pub stock_line_id: Option<String>,
}

#[derive(SimpleObject)]
pub struct RepackConnector {
    total_count: u32,
    nodes: Vec<RepackNode>,
}

#[Object]
impl RepackNode {
    async fn id(&self) -> &str {
        &self.id
    }

    async fn invoice(&self, ctx: &Context<'_>) -> Result<InvoiceNode> {
        let loader = ctx.get_loader::<DataLoader<InvoiceByIdLoader>>();
        let invoice = loader.load_one(self.id.clone()).await?.ok_or(
            StandardGraphqlError::InternalError(format!("Cannot find invoice {}", self.id))
                .extend(),
        )?;
        Ok(InvoiceNode { invoice })
    }

    async fn repack_id(&self) -> &str {
        &self.repack_id
    }

    async fn batch(&self) -> &Option<String> {
        &self.batch
    }

    async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.datetime, Utc)
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

    async fn pack_size(&self) -> f64 {
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

    async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        if let Some(stock_line_id) = &self.stock_line_id {
            let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();
            let stock_line = loader.load_one(stock_line_id.clone()).await?.ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find stock line {}",
                    stock_line_id
                ))
                .extend(),
            )?;
            Ok(Some(StockLineNode { stock_line }))
        } else {
            Ok(None)
        }
    }
}

impl RepackNode {
    pub fn from_domain(repack: Repack) -> RepackNode {
        let invoice = repack.invoice.invoice_row;
        let invoice_line_to = repack.invoice_line_to.invoice_line_row;
        let invoice_line_from = repack.invoice_line_from.invoice_line_row;

        RepackNode {
            id: invoice.id,
            repack_id: invoice_line_to.stock_line_id.clone().unwrap_or_default(),
            batch: invoice_line_to.batch,
            datetime: invoice
                .verified_datetime
                .unwrap_or(invoice.created_datetime),
            from: RepackStockLineNode {
                number_of_packs: invoice_line_from.number_of_packs,
                pack_size: invoice_line_from.pack_size,
                location_id: repack
                    .invoice_line_from
                    .location_row_option
                    .map(|l| l.id.clone()),
                stock_line_id: invoice_line_from.stock_line_id,
            },
            to: RepackStockLineNode {
                number_of_packs: invoice_line_to.number_of_packs,
                pack_size: invoice_line_to.pack_size,
                location_id: repack
                    .invoice_line_to
                    .location_row_option
                    .map(|l| l.id.clone()),
                stock_line_id: invoice_line_to.stock_line_id,
            },
        }
    }
}

impl RepackConnector {
    pub fn from_vec(repacks: Vec<Repack>) -> RepackConnector {
        let total_count = repacks.len() as u32;
        let nodes = repacks.into_iter().map(RepackNode::from_domain).collect();

        RepackConnector { total_count, nodes }
    }
}
