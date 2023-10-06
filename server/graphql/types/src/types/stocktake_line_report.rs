use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use repository::StocktakeLineReport;
use service::{i32_to_u32, usize_to_u32};

use graphql_core::{
    loader::{
        InventoryAdjustmentReasonByIdLoader, ItemLoader, LocationByIdLoader, StockLineByIdLoader,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use super::{InventoryAdjustmentReasonNode, ItemNode, LocationNode, StockLineNode};

/// This struct is used to represent stocktake line report in graphql schema
pub struct StocktakeLineReportNode {
    /// Stocktake line for reporting
    pub line: StocktakeLineReport,
}

#[Object]
impl StocktakeLineReportNode {
    pub async fn id(&self) -> &str {
        &self.line.line.id
    }

    pub async fn stocktake_id(&self) -> &str {
        &self.line.line.stocktake_id
    }

    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        if let Some(ref stock_line) = self.line.stock_line {
            let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();
            let stock_line = loader.load_one(stock_line.id.clone()).await?.ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find stock line {}",
                    stock_line.id
                ))
                .extend(),
            )?;
            Ok(Some(StockLineNode { stock_line }))
        } else {
            Ok(None)
        }
    }

    pub async fn location(&self, ctx: &Context<'_>) -> Option<LocationNode> {
        let location_id = self.line.line.location_id.clone().unwrap_or_default();
        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();
        let location_option: Option<repository::location::Location> =
            loader.load_one(location_id.clone()).await.ok().flatten();

        match location_option {
            Some(location) => Some(LocationNode::from_domain(location)),
            None => None,
        }
    }

    pub async fn comment(&self) -> Option<String> {
        self.line.line.comment.clone()
    }

    pub async fn snapshot_number_of_packs(&self) -> f64 {
        self.line.line.snapshot_number_of_packs
    }

    pub async fn counted_number_of_packs(&self) -> Option<f64> {
        self.line.line.counted_number_of_packs
    }

    pub async fn item_id(&self) -> &str {
        &self.line.line.item_id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.line.line.item_id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item_id {} for stocktake line id {}",
                self.line.line.item_id, self.line.line.id
            ))
            .extend(),
        )
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.line.line.batch
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.line.line.expiry_date
    }

    pub async fn pack_size(&self) -> Option<u32> {
        self.line.line.pack_size.map(i32_to_u32)
    }

    pub async fn cost_price_per_pack(&self) -> &Option<f64> {
        &self.line.line.cost_price_per_pack
    }

    pub async fn sell_price_per_pack(&self) -> &Option<f64> {
        &self.line.line.sell_price_per_pack
    }

    pub async fn note(&self) -> &Option<String> {
        &self.line.line.note
    }

    pub async fn inventory_adjustment_reason_id(&self) -> &Option<String> {
        &self.line.line.inventory_adjustment_reason_id
    }

    pub async fn inventory_adjustment_reason(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<InventoryAdjustmentReasonNode>> {
        let loader = ctx.get_loader::<DataLoader<InventoryAdjustmentReasonByIdLoader>>();
        let inventory_adjustment_reason_id = match &self.line.line.inventory_adjustment_reason_id {
            None => return Ok(None),
            Some(inventory_adjustment_reason_id) => inventory_adjustment_reason_id,
        };

        let result = loader
            .load_one(inventory_adjustment_reason_id.clone())
            .await?;

        Ok(result.map(InventoryAdjustmentReasonNode::from_domain))
    }
}

/// This struct is used to represent stocktake line report connector in graphql schema
#[derive(SimpleObject)]
pub struct StocktakeLineReportConnector {
    /// Total count of stocktake line for reporting
    total_count: u32,
    /// List of stocktake line for reporting
    nodes: Vec<StocktakeLineReportNode>,
}

impl StocktakeLineReportConnector {
    /// Create an empty stocktake line report connector
    pub fn empty() -> StocktakeLineReportConnector {
        StocktakeLineReportConnector {
            total_count: 0,
            nodes: Vec::new(),
        }
    }

    /// Create a stocktake line report connector from a vector of stocktake line for reporting
    pub fn from_domain_vec(from: Vec<StocktakeLineReport>) -> StocktakeLineReportConnector {
        StocktakeLineReportConnector {
            total_count: usize_to_u32(from.len()),
            nodes: from
                .into_iter()
                .map(|line| StocktakeLineReportNode { line })
                .collect(),
        }
    }
}

impl StocktakeLineReportNode {
    /// Create a stocktake line report node from a stocktake line for reporting
    pub fn from_domain(line: StocktakeLineReport) -> StocktakeLineReportNode {
        StocktakeLineReportNode { line }
    }
}
