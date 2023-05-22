use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDateTime;
use graphql_core::{
    loader::{LocationByIdLoader, StockLineByIdLoader},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
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
    pub stock_line_id: Option<String>,
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
        RepackNode {
            id: repack.invoice.invoice_row.id,
            repack_id: repack
                .invoice_line_to
                .invoice_line_row
                .stock_line_id
                .clone()
                .unwrap_or_default(),
            batch: repack.invoice_line_to.invoice_line_row.batch,
            datetime: repack
                .invoice
                .invoice_row
                .verified_datetime
                .unwrap_or(repack.invoice.invoice_row.created_datetime),
            from: RepackStockLineNode {
                number_of_packs: repack.invoice_line_from.invoice_line_row.number_of_packs,
                pack_size: repack.invoice_line_from.invoice_line_row.pack_size,
                location_id: repack
                    .invoice_line_from
                    .location_row_option
                    .map(|l| l.id.clone()),
                stock_line_id: repack.invoice_line_from.invoice_line_row.stock_line_id,
            },
            to: RepackStockLineNode {
                number_of_packs: repack.invoice_line_to.invoice_line_row.number_of_packs,
                pack_size: repack.invoice_line_to.invoice_line_row.pack_size,
                location_id: repack
                    .invoice_line_to
                    .location_row_option
                    .map(|l| l.id.clone()),
                stock_line_id: repack.invoice_line_to.invoice_line_row.stock_line_id,
            },
        }
    }
}
