use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use repository::{location::Location, ReasonOption, StocktakeLine};
use service::usize_to_u32;

use graphql_core::{
    loader::{
        CampaignByIdLoader, ItemLoader, ItemVariantByItemVariantIdLoader, StockLineByIdLoader,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use crate::types::CampaignNode;

use super::{
    InventoryAdjustmentReasonNode, ItemNode, ItemVariantNode, LocationNode, ReasonOptionNode,
    StockLineNode,
};

pub struct StocktakeLineNode {
    pub line: StocktakeLine,
}

#[Object]
impl StocktakeLineNode {
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

    pub async fn location(&self) -> Option<LocationNode> {
        self.line.location.as_ref().map(|row| {
            LocationNode::from_domain(Location {
                location_row: row.clone(),
            })
        })
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
        &self.line.item.id
    }

    pub async fn item_name(&self) -> &str {
        &self.line.line.item_name
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.line.item.id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item_id {} for stocktake line id {}",
                self.line.item.id, self.line.line.id
            ))
            .extend(),
        )
    }

    pub async fn item_variant_id(&self) -> &Option<String> {
        &self.line.line.item_variant_id
    }

    pub async fn batch(&self) -> &Option<String> {
        &self.line.line.batch
    }

    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.line.line.expiry_date
    }

    pub async fn pack_size(&self) -> Option<f64> {
        self.line.line.pack_size
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

    #[graphql(deprecation = "Since 2.8.0. Use reason_option instead")]
    pub async fn inventory_adjustment_reason_id(&self) -> &Option<String> {
        &self.line.line.reason_option_id
    }

    #[graphql(deprecation = "Since 2.8.0. Use reason_option instead")]
    pub async fn inventory_adjustment_reason(&self) -> Option<InventoryAdjustmentReasonNode> {
        self.line.reason_option.as_ref().map(|row| {
            InventoryAdjustmentReasonNode::from_domain(ReasonOption {
                reason_option_row: row.clone(),
            })
        })
    }

    pub async fn donor_id(&self) -> Option<String> {
        self.line.donor.clone().map(|d| d.id)
    }

    pub async fn donor_name(&self) -> Option<String> {
        self.line.donor.clone().map(|d| d.name)
    }

    pub async fn item_variant(&self, ctx: &Context<'_>) -> Result<Option<ItemVariantNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemVariantByItemVariantIdLoader>>();

        let item_variant_id = match &self.line.line.item_variant_id {
            None => return Ok(None),
            Some(item_variant_id) => item_variant_id,
        };

        let result = loader.load_one(item_variant_id.clone()).await?;

        Ok(result.map(ItemVariantNode::from_domain))
    }

    pub async fn reason_option(&self) -> Option<ReasonOptionNode> {
        self.line.reason_option.as_ref().map(|row| {
            ReasonOptionNode::from_domain(ReasonOption {
                reason_option_row: row.clone(),
            })
        })
    }

    pub async fn campaign(&self, ctx: &Context<'_>) -> Result<Option<CampaignNode>> {
        let loader = ctx.get_loader::<DataLoader<CampaignByIdLoader>>();

        let campaign_id = match &self.line.line.campaign_id {
            Some(campaign_id) => campaign_id,
            None => return Ok(None),
        };

        let result = loader.load_one(campaign_id.clone()).await?;
        Ok(result.map(CampaignNode::from_domain))
    }
}

#[derive(SimpleObject)]
pub struct StocktakeLineConnector {
    pub total_count: u32,
    pub nodes: Vec<StocktakeLineNode>,
}

impl StocktakeLineConnector {
    pub fn empty() -> StocktakeLineConnector {
        StocktakeLineConnector {
            total_count: 0,
            nodes: Vec::new(),
        }
    }

    pub fn from_domain_vec(from: Vec<StocktakeLine>) -> StocktakeLineConnector {
        StocktakeLineConnector {
            total_count: usize_to_u32(from.len()),
            nodes: from
                .into_iter()
                .map(|line| StocktakeLineNode { line })
                .collect(),
        }
    }
}

impl StocktakeLineNode {
    pub fn from_domain(line: StocktakeLine) -> StocktakeLineNode {
        StocktakeLineNode { line }
    }
}
