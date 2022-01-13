use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use repository::{location_to_domain, stock_line_to_domain, StockTakeLine};
use service::i32_to_u32;

use crate::{
    loader::{ItemLoader, LocationRowByIdLoader},
    schema::types::{LocationNode, StockLineNode},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use super::ItemNode;

pub struct StockTakeLineNode {
    pub line: StockTakeLine,
}

#[Object]
impl StockTakeLineNode {
    pub async fn id(&self) -> &str {
        &self.line.line.id
    }

    pub async fn stock_take_id(&self) -> &str {
        &self.line.line.stock_take_id
    }

    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        if let Some(ref stock_line) = self.line.stock_line {
            let loader = ctx.get_loader::<DataLoader<LocationRowByIdLoader>>();
            let location = if let Some(ref location_id) = stock_line.location_id {
                let result = loader.load_one(location_id.clone()).await?;
                Some(
                    result.ok_or(
                        StandardGraphqlError::InternalError(format!(
                            "Cannot find location {}",
                            location_id
                        ))
                        .extend(),
                    )?,
                )
            } else {
                None
            };
            Ok(Some(StockLineNode {
                stock_line: stock_line_to_domain((stock_line.clone(), location)),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn location_id(&self) -> Option<String> {
        self.line.line.location_id.clone()
    }

    pub async fn location(&self) -> Option<LocationNode> {
        self.line.location.clone().map(|location| LocationNode {
            location: location_to_domain(location),
        })
    }

    pub async fn comment(&self) -> Option<String> {
        self.line.line.comment.clone()
    }

    pub async fn snapshot_number_of_packs(&self) -> u32 {
        i32_to_u32(self.line.line.snapshot_number_of_packs)
    }

    pub async fn counted_number_of_packs(&self) -> Option<u32> {
        self.line.line.counted_number_of_packs.map(i32_to_u32)
    }

    pub async fn item_id(&self) -> &str {
        &self.line.line.item_id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<Option<ItemNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.line.line.item_id.clone()).await?;
        let item = item_option.ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item_id {} for stock take line id {}",
                self.line.line.item_id, self.line.line.id
            ))
            .extend(),
        )?;

        Ok(Some(ItemNode::from(item)))
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
}
